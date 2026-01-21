import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlng;
import 'package:geolocator/geolocator.dart';
import '../../providers/site_provider.dart';
import '../../theme/app_colors.dart';

class LiveMapScreen extends ConsumerStatefulWidget {
  const LiveMapScreen({super.key});

  @override
  ConsumerState<LiveMapScreen> createState() => _LiveMapScreenState();
}

class _LiveMapScreenState extends ConsumerState<LiveMapScreen> {
  final MapController _mapController = MapController();
  latlng.LatLng? _userLocation;
  latlng.LatLng? _mapCenter;
  double _zoom = 15.0;

  Future<void> _locateUser() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final req = await Geolocator.requestPermission();
        if (req == LocationPermission.denied ||
            req == LocationPermission.deniedForever)
          return;
      }
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best,
      );
      setState(
        () => _userLocation = latlng.LatLng(pos.latitude, pos.longitude),
      );
      _mapController.move(_userLocation!, _zoom);
    } catch (e) {
      // ignore errors — user can still view the map
    }
  }

  latlng.LatLng? _computeSiteCenter(List<List<double>> poly) {
    if (poly.isEmpty) return null;
    double sumLat = 0, sumLng = 0;
    for (final p in poly) {
      sumLat += p[0];
      sumLng += p[1];
    }
    return latlng.LatLng(sumLat / poly.length, sumLng / poly.length);
  }

  @override
  Widget build(BuildContext context) {
    final site = ref.watch(assignedSiteProvider);

    final polygons = <Polygon>[];
    latlng.LatLng? siteCenter;

    if (site != null && site.polygon.isNotEmpty) {
      polygons.add(
        Polygon(
          points: site.polygon.map((p) => latlng.LatLng(p[0], p[1])).toList(),
          color: AppColors.infoBackground.withOpacity(0.6),
          borderColor: AppColors.info,
          borderStrokeWidth: 2,
        ),
      );
      siteCenter = _computeSiteCenter(site.polygon);
    }

    final center =
        siteCenter ??
        _userLocation ??
        latlng.LatLng(21.146633, 79.088860); // fallback center

    final markers = <Marker>[];
    if (siteCenter != null) {
      markers.add(
        Marker(
          point: siteCenter,
          width: 40,
          height: 40,
          child: const Icon(Icons.business, color: Colors.orange, size: 32),
        ),
      );
    }
    if (_userLocation != null) {
      markers.add(
        Marker(
          point: _userLocation!,
          width: 36,
          height: 36,
          child: const Icon(Icons.my_location, color: Colors.blue, size: 28),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Site Map', style: Theme.of(context).textTheme.titleLarge),
      ),
      body: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: center,
          initialZoom: _zoom,
          maxZoom: 19,
          minZoom: 3,
          onPositionChanged: (pos, hasGesture) {
            if (pos.center != null) setState(() => _mapCenter = pos.center);
          },
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.example.app',
          ),
          if (polygons.isNotEmpty) PolygonLayer(polygons: polygons),
          if (markers.isNotEmpty) MarkerLayer(markers: markers),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton(
            heroTag: 'locate',
            onPressed: _locateUser,
            backgroundColor: AppColors.primary,
            child: const Icon(Icons.my_location),
          ),
          const SizedBox(height: 8),
          FloatingActionButton(
            heroTag: 'zoom_in',
            onPressed: () {
              setState(() {
                _zoom = (_zoom + 1).clamp(3.0, 19.0);
                final target = _mapCenter ?? center;
                _mapController.move(target, _zoom);
              });
            },
            mini: true,
            child: const Icon(Icons.zoom_in),
          ),
          const SizedBox(height: 6),
          FloatingActionButton(
            heroTag: 'zoom_out',
            onPressed: () {
              setState(() {
                _zoom = (_zoom - 1).clamp(3.0, 19.0);
                final target = _mapCenter ?? center;
                _mapController.move(target, _zoom);
              });
            },
            mini: true,
            child: const Icon(Icons.zoom_out),
          ),
        ],
      ),
    );
  }
}
