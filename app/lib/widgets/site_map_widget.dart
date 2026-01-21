import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../theme/app_colors.dart';

class SiteMapWidget extends StatefulWidget {
  final List<LatLng> geofence;
  final double? radius; // if it's a circular geofence

  const SiteMapWidget({
    super.key,
    required this.geofence,
    this.radius,
  });

  @override
  State<SiteMapWidget> createState() => _SiteMapWidgetState();
}

class _SiteMapWidgetState extends State<SiteMapWidget> {
  LatLng? _currentLocation;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition();
      if (mounted) {
        setState(() {
          _currentLocation = LatLng(position.latitude, position.longitude);
        });
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // Default center if no location or geofence
    LatLng center = LatLng(20.5937, 78.9629); // India center
    if (widget.geofence.isNotEmpty) {
      center = widget.geofence.first;
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
              userAgentPackageName: 'com.example.app',
            ),
            if (widget.geofence.isNotEmpty)
              PolygonLayer(
                polygons: <Polygon<Object>>[
                  Polygon(
                    points: widget.geofence,
                    color: AppColors.primary.withOpacity(0.2),
                    borderColor: AppColors.primary,
                    borderStrokeWidth: 2,
                  ),
                ],
              ),
            if (_currentLocation != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentLocation!,
                    width: 40,
                    height: 40,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.blue.withOpacity(0.3),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Container(
                          width: 12,
                          height: 12,
                          decoration: const BoxDecoration(
                            color: Colors.blue,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Colors.white, blurRadius: 4),
                            ],
                          ),
                        ),
                      ),
                    ),
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
