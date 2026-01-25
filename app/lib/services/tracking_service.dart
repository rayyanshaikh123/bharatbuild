import 'dart:async';
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import '../map/geofence_service.dart';
import '../storage/sqlite_service.dart';
import 'package:uuid/uuid.dart';

class TrackingService {
  static final TrackingService _instance = TrackingService._internal();
  factory TrackingService() => _instance;
  TrackingService._internal();

  final GeofenceService _geofenceService = GeofenceService();
  StreamSubscription<Position>? _positionSubscription;
  DateTime? _lastLogTime;
  
  Map<String, dynamic>? _currentProject;
  String? _currentUserRole;
  String? _currentUserId;

  bool _isCurrentlyBreached = false;

  void startTracking({
    required Map<String, dynamic> project,
    required String userRole,
    required String userId,
  }) {
    _currentProject = project;
    _currentUserRole = userRole;
    _currentUserId = userId;
    _isCurrentlyBreached = false;
    _lastLogTime = null;
    
    _stopTracking(); // Ensure no duplicate streams
    
    // High-precision stream with 5 meter filter
    final locationSettings = AndroidSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5,
      intervalDuration: const Duration(seconds: 5),
    );

    _positionSubscription = Geolocator.getPositionStream(locationSettings: locationSettings)
      .listen((position) async {
        await _processPosition(position);
      });
    
    // Initial check
    Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high).then((pos) {
      _processPosition(pos);
    });
  }

  void _stopTracking() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
  }

  Future<void> _processPosition(Position position) async {
    if (_currentProject == null || _currentUserId == null) return;

    try {
      final geofenceRes = _geofenceService.validateGeofence(
        position.latitude,
        position.longitude,
        _currentProject,
      );

      final bool isInvalid = !(geofenceRes['isValid'] ?? true);
      final now = DateTime.now();
      
      // LOGIC:
      // 1. If state changed (entered or exited), log immediately
      // 2. If 5 minutes passed since last log, send heartbeat log
      
      bool shouldLog = false;
      if (isInvalid != _isCurrentlyBreached) {
        _isCurrentlyBreached = isInvalid;
        shouldLog = true; // State change
      } else if (_lastLogTime == null || now.difference(_lastLogTime!).inMinutes >= 5) {
        shouldLog = true; // Heartbeat
      }

      if (shouldLog) {
        _lastLogTime = now;
        await _logTrackAction(
          latitude: position.latitude,
          longitude: position.longitude,
          isBreach: isInvalid,
        );
      }
    } catch (e) {
      print('Tracking error: $e');
    }
  }

  Future<void> _logTrackAction({
    required double latitude,
    required double longitude,
    required bool isBreach,
  }) async {
    final actionId = const Uuid().v4();
    final action = {
      'id': actionId,
      'user_role': _currentUserRole,
      'user_id': _currentUserId,
      'action_type': 'TRACK',
      'entity_type': 'ATTENDANCE',
      'project_id': _currentProject!['id'] ?? _currentProject!['project_id'],
      'payload': jsonEncode({
        'latitude': latitude,
        'longitude': longitude,
        'is_breach': isBreach,
        'timestamp': DateTime.now().toIso8601String(),
      }),
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'sync_status': 'PENDING',
    };

    await SQLiteService.insertAction(action);
  }

  void stop() {
    _stopTracking();
    _currentProject = null;
    _currentUserRole = null;
    _currentUserId = null;
  }
}
