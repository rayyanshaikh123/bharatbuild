import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:easy_localization/easy_localization.dart';
import '../theme/app_colors.dart';
import '../map/geofence_service.dart';

class SiteMapWidget extends StatefulWidget {
  final List<List<LatLng>> geofences; // Legacy polygon geofences
  final Map<String, dynamic>? orgData;
  final List<Map<String, dynamic>>? projectsData; // Should include geofence JSONB
  final double? radius; // Legacy radius

  const SiteMapWidget({
    super.key,
    required this.geofences,
    this.orgData,
    this.projectsData,
    this.radius,
  });

  @override
  State<SiteMapWidget> createState() => _SiteMapWidgetState();
}

class _SiteMapWidgetState extends State<SiteMapWidget> {
  LatLng? _currentLocation;
  final MapController _mapController = MapController();
  StreamSubscription<Position>? _positionSubscription;
  bool _hasCentered = false;

  @override
  void didUpdateWidget(SiteMapWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_hasCentered) {
      _attemptCentering();
    }
  }

  void _attemptCentering() {
    LatLng? bestCenter;

    if (widget.geofences.isNotEmpty && widget.geofences.first.isNotEmpty) {
      bestCenter = widget.geofences.first.first;
    } else if (widget.projectsData != null && widget.projectsData!.isNotEmpty) {
      final p = widget.projectsData!.first;
      if (p['latitude'] != null) {
        bestCenter = LatLng(
          double.parse(p['latitude'].toString()),
          double.parse(p['longitude'].toString()),
        );
      }
    } else if (widget.orgData != null && widget.orgData!['latitude'] != null) {
      bestCenter = LatLng(
        double.parse(widget.orgData!['latitude'].toString()),
        double.parse(widget.orgData!['longitude'].toString()),
      );
    }

    if (bestCenter != null) {
      _mapController.move(bestCenter, 15.0);
      _hasCentered = true;
    }
  }

  @override
  void initState() {
    super.initState();
    _startLocationTracking();
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _startLocationTracking() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    if (permission == LocationPermission.deniedForever) return;

    // Get initial position
    try {
      final position = await Geolocator.getCurrentPosition();
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
        });
      }
    } catch (e) {
      debugPrint('Error getting initial location: $e');
    }

    // Subscribe to updates
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // Default center priority: Geofence > Project Location > Org Location > Current Location > India
    LatLng center = const LatLng(20.5937, 78.9629); 
    
    LatLng? orgLoc;
    if (widget.orgData != null && widget.orgData!['latitude'] != null) {
      orgLoc = LatLng(
        double.parse(widget.orgData!['latitude'].toString()),
        double.parse(widget.orgData!['longitude'].toString()),
      );
    }

    if (widget.geofences.isNotEmpty && widget.geofences.first.isNotEmpty) {
      center = widget.geofences.first.first;
    } else if (widget.projectsData != null && widget.projectsData!.isNotEmpty) {
      final p = widget.projectsData!.first;
      center = LatLng(
        double.parse(p['latitude'].toString()),
        double.parse(p['longitude'].toString()),
      );
    } else if (orgLoc != null) {
      center = orgLoc;
    } else if (_currentLocation != null) {
      center = _currentLocation!;
    }

    return Container(
      height: 250,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: 15.0,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.bharatbuild.construction',
            ),
            // Render geofences from projectsData (supports GeoJSON and CIRCLE types)
            if (widget.projectsData != null)
              ...widget.projectsData!.where((p) => p['geofence'] != null).map((project) {
                try {
                  final geofenceJson = project['geofence'];
                  if (geofenceJson is! Map) return const SizedBox.shrink();
                  
                  // Handle GeoJSON Feature format (from web frontend)
                  if (geofenceJson['type'] == 'Feature') {
                    final geometry = geofenceJson['geometry'] as Map<String, dynamic>?;
                    if (geometry != null) {
                      final geomType = geometry['type'] as String?;
                      final coordinates = geometry['coordinates'] as dynamic;
                      
                      if (geomType == 'Polygon' && coordinates is List) {
                        // GeoJSON Polygon
                        final outerRing = coordinates[0] as List;
                        final polygonPoints = outerRing.map((coord) {
                          if (coord is List && coord.length >= 2) {
                            return LatLng(coord[1].toDouble(), coord[0].toDouble()); // GeoJSON is [lng, lat]
                          }
                          return null;
                        }).whereType<LatLng>().toList();
                        
                        if (polygonPoints.isNotEmpty) {
                          return PolygonLayer(
                            polygons: [
                              Polygon(
                                points: polygonPoints,
                                color: AppColors.primary.withOpacity(0.2),
                                borderColor: AppColors.primary,
                                borderStrokeWidth: 2,
                              ),
                            ],
                          );
                        }
                      } else if (geomType == 'Circle' || geomType == 'Point') {
                        // Try to extract circle
                        final properties = geofenceJson['properties'] as Map<String, dynamic>?;
                        if (properties != null && properties.containsKey('radius')) {
                          final center = coordinates is List && coordinates.length >= 2
                              ? LatLng(coordinates[1].toDouble(), coordinates[0].toDouble())
                              : null;
                          final radius = (properties['radius'] as num?)?.toDouble();
                          if (center != null && radius != null) {
                            final circlePoints = _generateCirclePoints(center, radius);
                            return PolygonLayer(
                              polygons: [
                                Polygon(
                                  points: circlePoints,
                                  color: AppColors.primary.withOpacity(0.2),
                                  borderColor: AppColors.primary,
                                  borderStrokeWidth: 2,
                                ),
                              ],
                            );
                          }
                        }
                      }
                    }
                  }
                  
                  // Handle simple CIRCLE type
                  if (geofenceJson['type'] == 'CIRCLE') {
                    final center = geofenceJson['center'] as Map<String, dynamic>?;
                    final radiusMeters = geofenceJson['radius_meters'] as num?;
                    
                    if (center != null && radiusMeters != null) {
                      final centerLat = (center['lat'] as num?)?.toDouble();
                      final centerLng = (center['lng'] as num?)?.toDouble();
                      
                      if (centerLat != null && centerLng != null) {
                        final circlePoints = _generateCirclePoints(
                          LatLng(centerLat, centerLng),
                          radiusMeters.toDouble(),
                        );
                        
                        return PolygonLayer(
                          polygons: [
                            Polygon(
                              points: circlePoints,
                              color: AppColors.primary.withOpacity(0.2),
                              borderColor: AppColors.primary,
                              borderStrokeWidth: 2,
                            ),
                          ],
                        );
                      }
                    }
                  }
                } catch (e) {
                  debugPrint('Error rendering geofence: $e');
                }
                return const SizedBox.shrink();
              }),
            // Render legacy polygon geofences
            if (widget.geofences.isNotEmpty)
              PolygonLayer(
                polygons: widget.geofences
                    .where((points) => points.isNotEmpty)
                    .map((points) => Polygon(
                          points: points,
                          color: AppColors.primary.withOpacity(0.2),
                          borderColor: AppColors.primary,
                          borderStrokeWidth: 2,
                        ))
                    .toList(),
              ),
            // Render legacy radius circles if provided
            if (widget.radius != null && widget.projectsData != null && widget.projectsData!.isNotEmpty)
              ...widget.projectsData!.where((p) => p['latitude'] != null && p['longitude'] != null).map((project) {
                final lat = double.parse(project['latitude'].toString());
                final lng = double.parse(project['longitude'].toString());
                final circlePoints = _generateCirclePoints(
                  LatLng(lat, lng),
                  widget.radius!,
                );
                return PolygonLayer(
                  polygons: [
                    Polygon(
                      points: circlePoints,
                      color: AppColors.primary.withOpacity(0.15),
                      borderColor: AppColors.primary.withOpacity(0.5),
                      borderStrokeWidth: 1.5,
                    ),
                  ],
                );
              }),
            MarkerLayer(
                markers: [
                  if (_currentLocation != null)
                    Marker(
                      point: _currentLocation!,
                      width: 40,
                      height: 40,
                      child: Tooltip(
                        message: 'your_location'.tr(),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.blue.withOpacity(0.3),
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Container(
                              width: 14,
                              height: 14,
                              decoration: BoxDecoration(
                                color: Colors.blue,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 4),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  if (widget.orgData != null && widget.orgData!['latitude'] != null)
                    Marker(
                      point: LatLng(
                        double.parse(widget.orgData!['latitude'].toString()),
                        double.parse(widget.orgData!['longitude'].toString()),
                      ),
                      width: 45,
                      height: 45,
                      child: Tooltip(
                        message: widget.orgData!['name'] ?? 'Organization',
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.business,
                            color: Colors.red,
                            size: 32,
                          ),
                        ),
                      ),
                    ),
                  if (widget.projectsData != null)
                    ...widget.projectsData!.where((p) => p['latitude'] != null).map((p) => Marker(
                          point: LatLng(
                            double.parse(p['latitude'].toString()),
                            double.parse(p['longitude'].toString()),
                          ),
                          width: 40,
                          height: 40,
                          child: Tooltip(
                            message: '${p['name'] ?? 'Project'}\n${p['location_text'] ?? ''}',
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Icon(
                                  Icons.location_on,
                                  color: Colors.orange.withOpacity(0.5),
                                  size: 40,
                                ),
                                const Icon(
                                  Icons.location_on,
                                  color: Colors.orange,
                                  size: 30,
                                ),
                                Positioned(
                                  top: 5,
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )),
                ],
              ),
            // Attribution
            RichAttributionWidget(
              attributions: [
                TextSourceAttribution(
                  'OpenStreetMap contributors',
                ),
              ],
            ),
            // Re-center button overlay
            Positioned(
              right: 12,
              bottom: 12,
              child: FloatingActionButton.small(
                heroTag: 'recenter_map',
                onPressed: () {
                  if (_currentLocation != null) {
                    _mapController.move(_currentLocation!, 16.0);
                  }
                },
                backgroundColor: theme.colorScheme.surface,
                child: const Icon(Icons.my_location, color: Colors.blue),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Generate circle points from center and radius (in meters)
  /// Uses Haversine formula to calculate points on a circle
  List<LatLng> _generateCirclePoints(LatLng center, double radiusMeters, {int segments = 64}) {
    final points = <LatLng>[];
    const R = 6371000.0; // Earth radius in meters
    
    for (int i = 0; i <= segments; i++) {
      final angle = (i * 360.0 / segments) * math.pi / 180.0;
      
      // Calculate point using Haversine formula
      final lat1 = center.latitude * math.pi / 180.0;
      final lon1 = center.longitude * math.pi / 180.0;
      
      final lat2 = math.asin(
        math.sin(lat1) * math.cos(radiusMeters / R) +
        math.cos(lat1) * math.sin(radiusMeters / R) * math.cos(angle),
      );
      
      final lon2 = lon1 + math.atan2(
        math.sin(angle) * math.sin(radiusMeters / R) * math.cos(lat1),
        math.cos(radiusMeters / R) - math.sin(lat1) * math.sin(lat2),
      );
      
      points.add(LatLng(lat2 * 180.0 / math.pi, lon2 * 180.0 / math.pi));
    }
    
    return points;
  }
}
