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
  Timer? _trackingTimer;
  
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
    _stopTracking(); // Ensure no duplicate timers

    // Track every 30 seconds
    _trackingTimer = Timer.periodic(const Duration(seconds: 30), (timer) async {
      await _checkAndLog();
    });
    
    // Initial check
    _checkAndLog();
  }

  void _stopTracking() {
    _trackingTimer?.cancel();
    _positionSubscription?.cancel();
  }

  Future<void> _checkAndLog() async {
    if (_currentProject == null || _currentUserId == null) return;

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final geofenceRes = _geofenceService.validateGeofence(
        position.latitude,
        position.longitude,
        _currentProject,
      );

      final bool isValid = geofenceRes['isValid'] ?? true;
      
      // If state changed (Inside -> Outside or Outside -> Inside), we must log
      // Or if still inside, we log heartbeat (optional, but requested for real-time monitoring)
      
      if (!isValid != _isCurrentlyBreached) {
        _isCurrentlyBreached = !isValid;
        
        await _logTrackAction(
          latitude: position.latitude,
          longitude: position.longitude,
        );
      }
    } catch (e) {
      print('Tracking error: $e');
    }
  }

  Future<void> _logTrackAction({
    required double latitude,
    required double longitude,
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
  }
}
