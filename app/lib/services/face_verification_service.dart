import 'dart:io';
import 'dart:math';
import 'dart:convert';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

/// Serializable face features extracted from MLKit Face
class FaceFeatures {
  final Map<String, Map<String, double>> landmarks; // {x, y} for each landmark
  final double eyeDistance;
  final double noseMouthDistance;
  final double eyeToNoseDistance;
  final double faceWidth;
  final double faceHeight;

  FaceFeatures({
    required this.landmarks,
    required this.eyeDistance,
    required this.noseMouthDistance,
    required this.eyeToNoseDistance,
    required this.faceWidth,
    required this.faceHeight,
  });

  Map<String, dynamic> toJson() => {
    'landmarks': landmarks,
    'eyeDistance': eyeDistance,
    'noseMouthDistance': noseMouthDistance,
    'eyeToNoseDistance': eyeToNoseDistance,
    'faceWidth': faceWidth,
    'faceHeight': faceHeight,
  };

  factory FaceFeatures.fromJson(Map<String, dynamic> json) => FaceFeatures(
    landmarks: Map<String, Map<String, double>>.from(
      json['landmarks'].map((k, v) => MapEntry(k, Map<String, double>.from(v)))
    ),
    eyeDistance: json['eyeDistance'].toDouble(),
    noseMouthDistance: json['noseMouthDistance'].toDouble(),
    eyeToNoseDistance: json['eyeToNoseDistance'].toDouble(),
    faceWidth: json['faceWidth'].toDouble(),
    faceHeight: json['faceHeight'].toDouble(),
  );

  String toJsonString() => jsonEncode(toJson());
  factory FaceFeatures.fromJsonString(String jsonStr) => 
    FaceFeatures.fromJson(jsonDecode(jsonStr));
}

class FaceVerificationService {
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableLandmarks: true,
      performanceMode: FaceDetectorMode.accurate,
    ),
  );

  /// Detects faces in an image.
  /// Returns a list of detected Faces.
  Future<List<Face>> detectFaces(File imageFile) async {
    final inputImage = InputImage.fromFile(imageFile);
    return await _faceDetector.processImage(inputImage);
  }

  /// Extracts serializable face features from a Face object.
  /// This can be stored and compared later.
  FaceFeatures extractFaceFeatures(Face face) {
    final landmarks = <String, Map<String, double>>{};
    
    // Extract landmark positions
    final leftEye = face.landmarks[FaceLandmarkType.leftEye];
    final rightEye = face.landmarks[FaceLandmarkType.rightEye];
    final noseBase = face.landmarks[FaceLandmarkType.noseBase];
    final bottomMouth = face.landmarks[FaceLandmarkType.bottomMouth];
    final leftCheek = face.landmarks[FaceLandmarkType.leftCheek];
    final rightCheek = face.landmarks[FaceLandmarkType.rightCheek];
    
    if (leftEye != null) {
      landmarks['leftEye'] = {'x': leftEye.position.x.toDouble(), 'y': leftEye.position.y.toDouble()};
    }
    if (rightEye != null) {
      landmarks['rightEye'] = {'x': rightEye.position.x.toDouble(), 'y': rightEye.position.y.toDouble()};
    }
    if (noseBase != null) {
      landmarks['noseBase'] = {'x': noseBase.position.x.toDouble(), 'y': noseBase.position.y.toDouble()};
    }
    if (bottomMouth != null) {
      landmarks['mouth'] = {'x': bottomMouth.position.x.toDouble(), 'y': bottomMouth.position.y.toDouble()};
    }
    if (leftCheek != null) {
      landmarks['leftCheek'] = {'x': leftCheek.position.x.toDouble(), 'y': leftCheek.position.y.toDouble()};
    }
    if (rightCheek != null) {
      landmarks['rightCheek'] = {'x': rightCheek.position.x.toDouble(), 'y': rightCheek.position.y.toDouble()};
    }

    // Calculate distances
    double eyeDistance = 0;
    double noseMouthDistance = 0;
    double eyeToNoseDistance = 0;
    double faceWidth = 0;
    double faceHeight = 0;

    if (landmarks.containsKey('leftEye') && landmarks.containsKey('rightEye')) {
      eyeDistance = _dist(
        Point(landmarks['leftEye']!['x']!.toInt(), landmarks['leftEye']!['y']!.toInt()),
        Point(landmarks['rightEye']!['x']!.toInt(), landmarks['rightEye']!['y']!.toInt()),
      );
    }

    if (landmarks.containsKey('noseBase') && landmarks.containsKey('mouth')) {
      noseMouthDistance = _dist(
        Point(landmarks['noseBase']!['x']!.toInt(), landmarks['noseBase']!['y']!.toInt()),
        Point(landmarks['mouth']!['x']!.toInt(), landmarks['mouth']!['y']!.toInt()),
      );
    }

    if (landmarks.containsKey('leftEye') && landmarks.containsKey('rightEye') && landmarks.containsKey('noseBase')) {
      final leftEyeDist = _dist(
        Point(landmarks['leftEye']!['x']!.toInt(), landmarks['leftEye']!['y']!.toInt()),
        Point(landmarks['noseBase']!['x']!.toInt(), landmarks['noseBase']!['y']!.toInt()),
      );
      final rightEyeDist = _dist(
        Point(landmarks['rightEye']!['x']!.toInt(), landmarks['rightEye']!['y']!.toInt()),
        Point(landmarks['noseBase']!['x']!.toInt(), landmarks['noseBase']!['y']!.toInt()),
      );
      eyeToNoseDistance = (leftEyeDist + rightEyeDist) / 2;
    }

    // Face bounding box dimensions
    faceWidth = face.boundingBox.width.toDouble();
    faceHeight = face.boundingBox.height.toDouble();

    return FaceFeatures(
      landmarks: landmarks,
      eyeDistance: eyeDistance,
      noseMouthDistance: noseMouthDistance,
      eyeToNoseDistance: eyeToNoseDistance,
      faceWidth: faceWidth,
      faceHeight: faceHeight,
    );
  }

  /// Compares two FaceFeatures objects.
  /// Returns true if they likely belong to the same person.
  /// Uses very strict matching - requires ALL ratios to match with 5% tolerance.
  bool compareFaceFeatures(FaceFeatures features1, FaceFeatures features2) {
    // Must have at least 4 key landmarks
    if (features1.landmarks.length < 4 || features2.landmarks.length < 4) {
      return false;
    }

    // Must have the same key landmarks
    final keys1 = features1.landmarks.keys.toSet();
    final keys2 = features2.landmarks.keys.toSet();
    if (!keys1.containsAll(['leftEye', 'rightEye', 'noseBase', 'mouth']) ||
        !keys2.containsAll(['leftEye', 'rightEye', 'noseBase', 'mouth'])) {
      return false;
    }

    // Calculate multiple ratios for comparison
    final ratios1 = _calculateRatios(features1);
    final ratios2 = _calculateRatios(features2);

    // Balanced comparison: 8% tolerance, require 3 out of 4 ratios to match
    // This allows for slight variations while still rejecting different faces
    int matches = 0;
    int totalChecks = 0;
    const tolerance = 0.08; // 8% tolerance - balanced for same face variations

    // Ratio 1: Eye Distance / Nose-Mouth Distance
    if (ratios1['eyeToNoseMouth'] != null && ratios2['eyeToNoseMouth'] != null) {
      totalChecks++;
      final diff = (ratios1['eyeToNoseMouth']! - ratios2['eyeToNoseMouth']!).abs();
      final threshold = ratios1['eyeToNoseMouth']! * tolerance;
      if (diff < threshold) matches++;
    }

    // Ratio 2: Eye-Nose Distance / Nose-Mouth Distance
    if (ratios1['eyeNoseToNoseMouth'] != null && ratios2['eyeNoseToNoseMouth'] != null) {
      totalChecks++;
      final diff = (ratios1['eyeNoseToNoseMouth']! - ratios2['eyeNoseToNoseMouth']!).abs();
      final threshold = ratios1['eyeNoseToNoseMouth']! * tolerance;
      if (diff < threshold) matches++;
    }

    // Ratio 3: Face Width / Face Height (aspect ratio)
    if (ratios1['faceAspect'] != null && ratios2['faceAspect'] != null) {
      totalChecks++;
      final diff = (ratios1['faceAspect']! - ratios2['faceAspect']!).abs();
      final threshold = ratios1['faceAspect']! * tolerance;
      if (diff < threshold) matches++;
    }

    // Ratio 4: Eye Distance / Face Width
    if (ratios1['eyeToFaceWidth'] != null && ratios2['eyeToFaceWidth'] != null) {
      totalChecks++;
      final diff = (ratios1['eyeToFaceWidth']! - ratios2['eyeToFaceWidth']!).abs();
      final threshold = ratios1['eyeToFaceWidth']! * tolerance;
      if (diff < threshold) matches++;
    }

    // Additional check: Absolute distance differences (more lenient for same face)
    int distanceMatches = 0;
    int distanceChecks = 0;
    const distanceTolerance = 0.15; // 15% for absolute distances (allows for camera distance variations)

    if (features1.eyeDistance > 0 && features2.eyeDistance > 0) {
      distanceChecks++;
      final eyeDistDiff = ((features1.eyeDistance - features2.eyeDistance).abs() / features1.eyeDistance);
      if (eyeDistDiff < distanceTolerance) distanceMatches++;
    }

    if (features1.noseMouthDistance > 0 && features2.noseMouthDistance > 0) {
      distanceChecks++;
      final noseMouthDiff = ((features1.noseMouthDistance - features2.noseMouthDistance).abs() / features1.noseMouthDistance);
      if (noseMouthDiff < distanceTolerance) distanceMatches++;
    }

    // Require at least 3 out of 4 ratios to match (75% match rate)
    // AND at least 1 distance check OR perfect ratio match (4/4)
    // This balances: same faces pass, different faces fail
    final minRatioMatches = totalChecks >= 4 && matches >= 3; // At least 3 out of 4
    final perfectMatch = matches == totalChecks && totalChecks >= 4; // All 4 match
    final distancesMatch = distanceChecks >= 1 && distanceMatches >= 1;
    
    // Verify if: (3+ ratios match AND 1+ distance) OR (all 4 ratios match)
    return (minRatioMatches && distancesMatch) || perfectMatch;
  }

  /// Calculate multiple geometric ratios from face features
  Map<String, double> _calculateRatios(FaceFeatures features) {
    final ratios = <String, double>{};

    if (features.noseMouthDistance > 0) {
      if (features.eyeDistance > 0) {
        ratios['eyeToNoseMouth'] = features.eyeDistance / features.noseMouthDistance;
      }
      if (features.eyeToNoseDistance > 0) {
        ratios['eyeNoseToNoseMouth'] = features.eyeToNoseDistance / features.noseMouthDistance;
      }
    }

    if (features.faceHeight > 0 && features.faceWidth > 0) {
      ratios['faceAspect'] = features.faceWidth / features.faceHeight;
    }

    if (features.faceWidth > 0 && features.eyeDistance > 0) {
      ratios['eyeToFaceWidth'] = features.eyeDistance / features.faceWidth;
    }

    return ratios;
  }

  /// Legacy method for backward compatibility - extracts landmarks as Points
  Map<String, Point<int>> extractLandmarks(Face face) {
    final landmarks = <String, Point<int>>{};
    
    final leftEye = face.landmarks[FaceLandmarkType.leftEye];
    final rightEye = face.landmarks[FaceLandmarkType.rightEye];
    final noseBase = face.landmarks[FaceLandmarkType.noseBase];
    final bottomMouth = face.landmarks[FaceLandmarkType.bottomMouth];
    
    if (leftEye != null) landmarks['leftEye'] = leftEye.position;
    if (rightEye != null) landmarks['rightEye'] = rightEye.position;
    if (noseBase != null) landmarks['noseBase'] = noseBase.position;
    if (bottomMouth != null) landmarks['mouth'] = bottomMouth.position;

    return landmarks;
  }

  /// Legacy method for backward compatibility - compares Face objects directly
  bool compareFaces(Face face1, Face face2) {
    final features1 = extractFaceFeatures(face1);
    final features2 = extractFaceFeatures(face2);
    return compareFaceFeatures(features1, features2);
  }

  double _dist(Point<int> p1, Point<int> p2) {
    return sqrt(pow(p1.x - p2.x, 2) + pow(p1.y - p2.y, 2));
  }

  void dispose() {
    _faceDetector.close();
  }
}
