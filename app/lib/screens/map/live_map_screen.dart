import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as latlng;
import '../../providers/site_provider.dart';
import '../../theme/app_colors.dart';

class LiveMapScreen extends ConsumerWidget {
  const LiveMapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final site = ref.watch(assignedSiteProvider);

    final polygons = <Polygon>[];

    if (site != null && site.polygon.isNotEmpty) {
      polygons.add(
        Polygon(
          points: site.polygon.map((p) => latlng.LatLng(p[0], p[1])).toList(),
          color: AppColors.infoBackground.withOpacity(0.9),
          borderColor: AppColors.info,
          borderStrokeWidth: 2,
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Site Map', style: Theme.of(context).textTheme.titleLarge),
      ),
      body: FlutterMap(
        options: MapOptions(),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.example.app',
          ),
          if (polygons.isNotEmpty) PolygonLayer(polygons: polygons),
        ],
      ),
    );
  }
}
