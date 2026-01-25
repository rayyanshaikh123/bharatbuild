import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../map/geofence_service.dart';
import '../../theme/app_colors.dart';
import '../../providers/attendance_provider.dart';

class LiveTrackingMapScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> project;
  const LiveTrackingMapScreen({super.key, required this.project});

  @override
  ConsumerState<LiveTrackingMapScreen> createState() => _LiveTrackingMapScreenState();
}

class _LiveTrackingMapScreenState extends ConsumerState<LiveTrackingMapScreen> with SingleTickerProviderStateMixin {
  final MapController _mapController = MapController();
  final GeofenceService _geofenceService = GeofenceService();
  StreamSubscription<Position>? _positionSubscription;
  Position? _currentPosition;
  bool _isInside = true;
  double _distanceFromEdge = 0;
  List<LatLng> _geofencePoints = [];
  LatLng? _siteRadiusCenter;
  double? _siteRadius;
  bool _hasCenteredOnUser = false;
  
  Timer? _workTimer;
  Duration _workDuration = Duration.zero;
  late AnimationController _markerPulseController;

  @override
  void initState() {
    super.initState();
    _markerPulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _parseProjectGeofence();
    _initWorkDuration();
    _startLiveTracking();
    _startWorkTimer();
  }

  void _initWorkDuration() {
    final checkInStr = widget.project['check_in']?.toString();
    if (checkInStr != null) {
      final checkInTime = DateTime.parse(checkInStr);
      // If we have total_work_seconds from backend (synced), we use that as base
      final baseSeconds = int.tryParse(widget.project['total_work_seconds']?.toString() ?? '0') ?? 0;
      if (baseSeconds > 0) {
        _workDuration = Duration(seconds: baseSeconds);
      } else {
        _workDuration = DateTime.now().difference(checkInTime);
      }
    }
  }

  void _startWorkTimer() {
    _workTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_isInside && mounted) {
        setState(() {
          _workDuration += const Duration(seconds: 1);
        });
      }
    });
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _workTimer?.cancel();
    _markerPulseController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  void _parseProjectGeofence() {
    final geofenceData = GeofenceData.fromJson(widget.project['geofence'] ?? {});
    setState(() {
      if (geofenceData.type == 'CIRCLE') {
        final lat = (geofenceData.center?['lat'] as num?)?.toDouble();
        final lng = (geofenceData.center?['lng'] as num?)?.toDouble();
        if (lat != null && lng != null) {
          _siteRadiusCenter = LatLng(lat, lng);
          _siteRadius = geofenceData.radiusMeters;
        }
      } else if (geofenceData.type == 'POLYGON' && geofenceData.polygon != null) {
        _geofencePoints = geofenceData.polygon!.map((p) => LatLng(p[0], p[1])).toList();
        if (_geofencePoints.isNotEmpty) {
           _siteRadiusCenter = _geofencePoints.first; // Rough center for initial camera
        }
      } else {
        // Legacy fallback
        final lat = (widget.project['latitude'] as num?)?.toDouble();
        final lng = (widget.project['longitude'] as num?)?.toDouble();
        final rad = (widget.project['geofence_radius'] as num?)?.toDouble();
        if (lat != null && lng != null) {
          _siteRadiusCenter = LatLng(lat, lng);
          _siteRadius = rad ?? 100;
        }
      }
    });
  }

  void _startLiveTracking() {
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((Position position) {
      if (!mounted) return;

      final validation = _geofenceService.validateGeofence(
        position.latitude,
        position.longitude,
        widget.project,
      );

      final userLatLng = LatLng(position.latitude, position.longitude);

      setState(() {
        _currentPosition = position;
        _isInside = validation['isValid'] ?? true;
        _distanceFromEdge = (validation['distance'] as num?)?.toDouble() ?? 0;
      });

      // Auto-center on first fix
      if (!_hasCenteredOnUser) {
        _hasCenteredOnUser = true;
        _mapController.move(userLatLng, 17.0);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final userLatLng = _currentPosition != null 
        ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude) 
        : null;

    return Scaffold(
      appBar: AppBar(
        title: Text('site_tracking'.tr()),
        actions: [
          if (userLatLng != null)
            IconButton(
              icon: const Icon(Icons.my_location),
              onPressed: () => _mapController.move(userLatLng, 17.0),
            ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: userLatLng ?? _siteRadiusCenter ?? const LatLng(20.5937, 78.9629),
              initialZoom: 17.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.bharatbuild.app',
              ),
              // site boundary
              if (_siteRadiusCenter != null && _siteRadius != null)
                CircleLayer(
                  circles: [
                    CircleMarker(
                      point: _siteRadiusCenter!,
                      radius: _siteRadius!,
                      useRadiusInMeter: true,
                      color: AppColors.primary.withOpacity(0.1),
                      borderColor: AppColors.primary,
                      borderStrokeWidth: 2,
                    ),
                  ],
                ),
              if (_geofencePoints.isNotEmpty)
                PolygonLayer(
                  polygons: [
                    Polygon(
                      points: _geofencePoints,
                      color: AppColors.primary.withOpacity(0.1),
                      borderColor: AppColors.primary,
                      borderStrokeWidth: 2,
                    ),
                  ],
                ),
              // User Marker
              if (userLatLng != null)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: userLatLng,
                      width: 80,
                      height: 80,
                      child: AnimatedBuilder(
                        animation: _markerPulseController,
                        builder: (context, child) {
                          return Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 40 + (40 * _markerPulseController.value),
                                height: 40 + (40 * _markerPulseController.value),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: (_isInside ? Colors.blue : Colors.red).withOpacity(0.2 * (1.0 - _markerPulseController.value)),
                                ),
                              ),
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _isInside ? Colors.blue : Colors.red,
                                  border: Border.all(color: Colors.white, width: 3),
                                  boxShadow: [
                                    BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 8, offset: const Offset(0, 4)),
                                  ],
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  ],
                ),
            ],
          ),
          
          // Information Overlay
          Positioned(
            bottom: 32,
            left: 16,
            right: 16,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!_isInside)
                  _buildAlertBanner(theme),
                const SizedBox(height: 12),
                _buildStatusCard(theme),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertBanner(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.red,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(color: Colors.red.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: Colors.white),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'OUTSIDE SITE BOUNDARY',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                Text(
                  'Move back inside to avoid attendance recording issues.',
                  style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(ThemeData theme) {
    String _formatDuration(Duration d) {
      String twoDigits(int n) => n.toString().padLeft(2, '0');
      final hours = twoDigits(d.inHours);
      final minutes = twoDigits(d.inMinutes.remainder(60));
      final seconds = twoDigits(d.inSeconds.remainder(60));
      return "$hours:$minutes:$seconds";
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.project['project_name'] ?? 'Construction Site',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 4),
          Text(
            widget.project['location_text'] ?? '',
            style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[500]),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _statusIndicator('Status', _isInside ? 'On-Site' : 'Away', _isInside ? Colors.green : Colors.red),
              const Spacer(),
              _statusIndicator('Distance', _isInside ? 'Inside' : '${_distanceFromEdge.abs().round()}m', theme.colorScheme.primary),
              const Spacer(),
              _statusIndicator('GPS', _currentPosition != null ? 'Active' : 'Searching...', _currentPosition != null ? Colors.blue : Colors.orange),
              const Spacer(),
              _statusIndicator('Work Time', _formatDuration(_workDuration), Colors.purple),
            ],
          ),
        ],
      ),
    );
  }

  Widget _statusIndicator(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 14)),
      ],
    );
  }
}
