import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../theme/app_colors.dart';
import 'job_details_screen.dart';

class JobsMapScreen extends StatefulWidget {
  final List<dynamic> jobs;
  const JobsMapScreen({super.key, required this.jobs});

  @override
  State<JobsMapScreen> createState() => _JobsMapScreenState();
}

class _JobsMapScreenState extends State<JobsMapScreen> {
  final MapController _mapController = MapController();

  @override
  Widget build(BuildContext context) {
    // Default center to first job or middle of India
    LatLng center = const LatLng(20.5937, 78.9629);
    if (widget.jobs.isNotEmpty && widget.jobs.first['latitude'] != null) {
      center = LatLng(
        double.parse(widget.jobs.first['latitude'].toString()),
        double.parse(widget.jobs.first['longitude'].toString()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('available_jobs'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.list),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: center,
          initialZoom: 5.0,
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.bharatbuild.construction',
          ),
          MarkerLayer(
            markers: widget.jobs
                .where((j) => j['latitude'] != null && j['longitude'] != null)
                .map((job) {
              final canApply = job['can_apply'] == true;
              return Marker(
                point: LatLng(
                  double.parse(job['latitude'].toString()),
                  double.parse(job['longitude'].toString()),
                ),
                width: 60,
                height: 60,
                child: GestureDetector(
                  onTap: () => _showJobSnippet(context, job),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: canApply ? AppColors.primary : Colors.grey,
                          borderRadius: BorderRadius.circular(4),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4),
                          ],
                        ),
                        child: Text(
                          job['category']?.toString().substring(0, 1).toUpperCase() ?? '?',
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Icon(
                        Icons.location_on,
                        color: canApply ? AppColors.primary : Colors.grey,
                        size: 30,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          RichAttributionWidget(
            attributions: [
              TextSourceAttribution('OpenStreetMap contributors'),
            ],
          ),
        ],
      ),
    );
  }

  void _showJobSnippet(BuildContext context, dynamic job) {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        final theme = Theme.of(context);
        final canApply = job['can_apply'] == true;
        
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    job['project_name'] ?? 'Project',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  if (!canApply)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'too_far'.tr(),
                        style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                job['location_text'] ?? 'No address set',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => JobDetailsScreen(jobId: job['id'].toString()),
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                ),
                child: Text('view_details'.tr()),
              ),
            ],
          ),
        );
      },
    );
  }
}
