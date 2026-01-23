import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:easy_localization/easy_localization.dart';
import '../theme/app_colors.dart';

class SiteMapWidget extends StatefulWidget {
  final List<List<LatLng>> geofences;
  final Map<String, dynamic>? orgData;
  final List<Map<String, dynamic>>? projectsData;
  final double? radius;

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
}
