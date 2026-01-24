import 'dart:io';
import 'dart:math';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;

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

  /// Extracts simple geometric features (landmarks) from a face.
  Map<String, Point<int>> extractLandmarks(Face face) {
    final landmarks = <String, Point<int>>{};
    
    // We rely on these visible landmarks
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

  /// Compares two faces based on geometric ratios.
  /// Returns true if they likely belong to the same person (heuristic).
  bool compareFaces(Face face1, Face face2) {
    final l1 = extractLandmarks(face1);
    final l2 = extractLandmarks(face2);

    // If landmarks key points missing, fallback to strict false
    if (l1.length < 4 || l2.length < 4) return false;

    // Calculate Ratios (Scale Invariant)
    // 1. Eye Distance / Nose-Mouth Distance
    double ratio1 = _getEyeDistance(l1) / _getNoseMouthDistance(l1);
    double ratio2 = _getEyeDistance(l2) / _getNoseMouthDistance(l2);

    // 2. Eye-Nose Distance / Nose-Mouth Distance
    double ratio1b = _getEyeToNoseDistance(l1) / _getNoseMouthDistance(l1);
    double ratio2b = _getEyeToNoseDistance(l2) / _getNoseMouthDistance(l2);

    // Tolerance (e.g. 15% difference allowed due to angle/expression)
    bool match1 = (ratio1 - ratio2).abs() < (ratio1 * 0.15);
    bool match2 = (ratio1b - ratio2b).abs() < (ratio1b * 0.15);

    // print("Ratio1: $ratio1 vs $ratio2 (Match: $match1)");
    // print("Ratio2: $ratio1b vs $ratio2b (Match: $match2)");

    return match1 && match2;
  }

  double _getEyeDistance(Map<String, Point<int>> l) {
    return _dist(l['leftEye']!, l['rightEye']!);
  }

  double _getNoseMouthDistance(Map<String, Point<int>> l) {
    return _dist(l['noseBase']!, l['mouth']!);
  }
  
  double _getEyeToNoseDistance(Map<String, Point<int>> l) {
    // Average of both eyes to nose
    double d1 = _dist(l['leftEye']!, l['noseBase']!);
    double d2 = _dist(l['rightEye']!, l['noseBase']!);
    return (d1 + d2) / 2;
  }

  double _dist(Point<int> p1, Point<int> p2) {
    return sqrt(pow(p1.x - p2.x, 2) + pow(p1.y - p2.y, 2));
  }

  void dispose() {
    _faceDetector.close();
  }
}
