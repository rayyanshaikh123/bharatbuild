import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class ProjectGeofenceScreen extends StatefulWidget {
  final dynamic project;

  const ProjectGeofenceScreen({super.key, required this.project});

  @override
  State<ProjectGeofenceScreen> createState() => _ProjectGeofenceScreenState();
}

class _ProjectGeofenceScreenState extends State<ProjectGeofenceScreen> {
  final MapController _mapController = MapController();

  LatLng center = const LatLng(19.0760, 72.8777); // default Mumbai

  @override
  Widget build(BuildContext context) {
    final p = widget.project;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Project Geofence"),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 360,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: center,
                  initialZoom: 15,
                ),
                children: [
                  TileLayer(
                    urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                    userAgentPackageName: 'com.example.bharatbuild',
                  ),
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: center,
                        width: 50,
                        height: 50,
                        child: const Icon(
                          Icons.location_on,
                          color: Colors.red,
                          size: 40,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p?.name ?? "Project Site",
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                const Text("Geofence center pinned on map"),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
