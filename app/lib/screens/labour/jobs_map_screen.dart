import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../theme/app_colors.dart';
import 'job_details_screen.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../providers/location_provider.dart';
import '../../providers/user_provider.dart';

class JobsMapScreen extends ConsumerStatefulWidget {
  final List<dynamic> jobs;
  const JobsMapScreen({super.key, required this.jobs});

  @override
  ConsumerState<JobsMapScreen> createState() => _JobsMapScreenState();
}

class _JobsMapScreenState extends ConsumerState<JobsMapScreen> {
  final MapController _mapController = MapController();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // Default center to India or first job
    LatLng center = const LatLng(20.5937, 78.9629);
    if (widget.jobs.isNotEmpty && widget.jobs.first['latitude'] != null) {
      center = LatLng(
        double.parse(widget.jobs.first['latitude'].toString()),
        double.parse(widget.jobs.first['longitude'].toString()),
      );
    }

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text('find_work'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white.withOpacity(0.8),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.list_alt_rounded),
              onPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: center,
              initialZoom: 13.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                userAgentPackageName: 'com.bharatbuild.app',
              ),
              MarkerLayer(
                markers: widget.jobs
                    .where((j) => j['latitude'] != null && j['longitude'] != null)
                    .map((job) {
                  final canApply = job['can_apply'] == true;
                  final wage = job['wage_rate'] ?? 'N/A';
                  
                  return Marker(
                    point: LatLng(
                      double.parse(job['latitude'].toString()),
                      double.parse(job['longitude'].toString()),
                    ),
                    width: 70,
                    height: 80,
                    child: GestureDetector(
                      onTap: () => _showJobSnippet(context, job),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: canApply ? theme.colorScheme.primary : Colors.grey[700],
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.15),
                                  blurRadius: 8,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Text(
                              '₹$wage',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          CustomPaint(
                            size: const Size(10, 8),
                            painter: _TrianglePainter(
                              color: canApply ? theme.colorScheme.primary : Colors.grey[700]!,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: canApply ? theme.colorScheme.primary : Colors.grey[400]!,
                                width: 2,
                              ),
                            ),
                            child: Icon(
                              Icons.work_rounded,
                              size: 18,
                              color: canApply ? theme.colorScheme.primary : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showJobSnippet(BuildContext context, dynamic job) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        final theme = Theme.of(context);
        final userPos = ref.watch(locationProvider).value;
        final userProfile = ref.watch(currentUserProvider);
        final canApply = job['can_apply'] == true;
        
        double? distValue;
        if (job['distance_meters'] != null) {
          distValue = double.tryParse(job['distance_meters'].toString());
        } else if (job['latitude'] != null && job['longitude'] != null) {
          double? uLat;
          double? uLon;
          
          if (userProfile != null) {
            uLat = userProfile['primary_latitude'] != null ? double.tryParse(userProfile['primary_latitude'].toString()) : null;
            uLon = userProfile['primary_longitude'] != null ? double.tryParse(userProfile['primary_longitude'].toString()) : null;
          }
          if (uLat == null && userPos != null) {
            uLat = userPos.latitude;
            uLon = userPos.longitude;
          }

          if (uLat != null && uLon != null) {
            distValue = Geolocator.distanceBetween(uLat, uLon, double.parse(job['latitude'].toString()), double.parse(job['longitude'].toString()));
          }
        }

        final distance = distValue?.round();

        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            job['category']?.toString().toUpperCase() ?? '',
                            style: TextStyle(
                              color: theme.colorScheme.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          job['project_name'] ?? 'Project',
                          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  if (distance != null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          'distance'.tr(),
                          style: theme.textTheme.labelSmall?.copyWith(color: Colors.grey),
                        ),
                        Text(
                          distance < 1000 ? '${distance}m' : '${(distance / 1000).toStringAsFixed(1)}km',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(Icons.location_on_rounded, color: Colors.grey[400], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      job['location_text'] ?? 'No address set',
                      style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[700]),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: _infoCard(
                      context,
                      'daily_wage'.tr(),
                      '₹${job['wage_rate'] ?? 'N/A'}',
                      Icons.payments_outlined,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _infoCard(
                      context,
                      'openings'.tr(),
                      '${job['required_count']}',
                      Icons.person_add_alt_1_outlined,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
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
                  minimumSize: const Size(double.infinity, 60),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                  elevation: 0,
                ),
                child: Text(
                  'view_job_details'.tr(),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _infoCard(BuildContext context, String label, String value, IconData icon) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(height: 8),
          Text(label, style: theme.textTheme.labelSmall?.copyWith(color: Colors.grey[600])),
          const SizedBox(height: 4),
          Text(value, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

class _TrianglePainter extends CustomPainter {
  final Color color;
  _TrianglePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final path = ui.Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width / 2, size.height)
      ..close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
