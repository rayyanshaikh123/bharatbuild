import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../../theme/app_colors.dart';
import '../../providers/auth_providers.dart';
import '../../providers/user_provider.dart';

class ProjectsMapScreen extends ConsumerStatefulWidget {
  const ProjectsMapScreen({super.key});

  @override
  ConsumerState<ProjectsMapScreen> createState() => _ProjectsMapScreenState();
}

class _ProjectsMapScreenState extends ConsumerState<ProjectsMapScreen> {
  final MapController _mapController = MapController();
  List<dynamic> _projects = [];
  bool _loading = true;
  bool _showRadius = true;
  LatLng? _userLocation;
  double _travelRadius = 10000; // default 10km
  LatLng? _currentGpsLocation;
  StreamSubscription<Position>? _positionSubscription;

  @override
  void initState() {
    super.initState();
    _loadData();
    _startLocationTracking();
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _startLocationTracking() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }
    if (permission == LocationPermission.deniedForever) return;

    try {
      final position = await Geolocator.getCurrentPosition();
      if (mounted) {
        setState(() {
          _currentGpsLocation = LatLng(position.latitude, position.longitude);
        });
      }
    } catch (e) {
      debugPrint('Error getting GPS location: $e');
    }

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10,
      ),
    ).listen((Position position) {
      if (mounted) {
        setState(() {
          _currentGpsLocation = LatLng(position.latitude, position.longitude);
        });
      }
    });
  }

  Future<void> _loadData() async {
    try {
      final authService = ref.read(authServiceProvider);
      
      // Fetch projects, available jobs and profile in parallel
      final results = await Future.wait([
        authService.getAllProjects(),
        authService.getAvailableJobs(),
        authService.getLabourProfile(),
      ]);

      final projectsResponse = results[0] as Map<String, dynamic>;
      final availableJobs = results[1] as List<dynamic>;
      final labour = results[2] as Map<String, dynamic>?;

      LatLng? userLoc;
      if (labour != null) {
        final lat = labour['primary_latitude'];
        final lng = labour['primary_longitude'];
        if (lat != null && lng != null) {
          userLoc = LatLng(
            double.parse(lat.toString()),
            double.parse(lng.toString()),
          );
        }
        final radius = labour['travel_radius_meters'];
        if (radius != null) {
          _travelRadius = double.parse(radius.toString());
        }
      }

      // Map jobs to projects for easy lookup
      final Map<String, dynamic> projectToJob = {};
      for (var job in availableJobs) {
        final pid = job['project_id'].toString();
        // If multiple jobs for same project, we might want to show them all, 
        // but for now let's just pick one or store them in a list.
        if (!projectToJob.containsKey(pid)) {
          projectToJob[pid] = job;
        }
      }

      final List<dynamic> updatedProjects = (projectsResponse['projects'] as List).map((p) {
        final pid = p['id'].toString();
        return {
          ...p,
          'job': projectToJob[pid], // Attach job data if available
        };
      }).toList();

      setState(() {
        _projects = updatedProjects;
        _userLocation = userLoc;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e')),
        );
      }
    }
  }

  Future<void> _updatePrimaryAddressToCurrent() async {
    if (_currentGpsLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('GPS location not available')),
      );
      return;
    }

    try {
      final authService = ref.read(authServiceProvider);
      await authService.updateLabourProfile({
        'primary_latitude': _currentGpsLocation!.latitude,
        'primary_longitude': _currentGpsLocation!.longitude,
      });
      setState(() {
        _userLocation = _currentGpsLocation;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('primary_address_updated'.tr())),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  double _calculateDistance(LatLng from, LatLng to) {
    const Distance distance = Distance();
    return distance.as(LengthUnit.Meter, from, to);
  }

  bool _isWithinRadius(dynamic project) {
    if (_userLocation == null) return true; // If no user location, allow all
    final lat = project['latitude'];
    final lng = project['longitude'];
    if (lat == null || lng == null) return false;
    
    final projectLoc = LatLng(
      double.parse(lat.toString()),
      double.parse(lng.toString()),
    );
    final dist = _calculateDistance(_userLocation!, projectLoc);
    return dist <= _travelRadius;
  }

  String _formatDistance(double meters) {
    if (meters < 1000) {
      return '${meters.round()} m';
    }
    return '${(meters / 1000).toStringAsFixed(1)} km';
  }

  List<LatLng> _generateCirclePoints(LatLng center, double radiusMeters, {int segments = 64}) {
    final points = <LatLng>[];
    const R = 6371000.0; // Earth radius in meters
    
    for (int i = 0; i <= segments; i++) {
      final angle = (i * 360.0 / segments) * math.pi / 180.0;
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

  List<LatLng>? _parseGeofence(dynamic geofenceJson) {
    if (geofenceJson == null || geofenceJson is! Map) return null;
    
    try {
      // Handle GeoJSON Feature format
      if (geofenceJson['type'] == 'Feature') {
        final geometry = geofenceJson['geometry'] as Map<String, dynamic>?;
        if (geometry != null && geometry['type'] == 'Polygon') {
          final coordinates = geometry['coordinates'];
          if (coordinates is List && coordinates.isNotEmpty) {
            final outerRing = coordinates[0] as List;
            return outerRing.map((coord) {
              if (coord is List && coord.length >= 2) {
                return LatLng(coord[1].toDouble(), coord[0].toDouble());
              }
              return null;
            }).whereType<LatLng>().toList();
          }
        }
        // Handle Circle in GeoJSON
        if (geometry != null && (geometry['type'] == 'Circle' || geometry['type'] == 'Point')) {
          final properties = geofenceJson['properties'] as Map<String, dynamic>?;
          if (properties != null && properties.containsKey('radius')) {
            final coords = geometry['coordinates'];
            if (coords is List && coords.length >= 2) {
              final center = LatLng(coords[1].toDouble(), coords[0].toDouble());
              final radius = (properties['radius'] as num).toDouble();
              return _generateCirclePoints(center, radius);
            }
          }
        }
      }
      
      // Handle simple CIRCLE type
      if (geofenceJson['type'] == 'CIRCLE') {
        final center = geofenceJson['center'] as Map<String, dynamic>?;
        final radiusMeters = geofenceJson['radius_meters'] as num?;
        if (center != null && radiusMeters != null) {
          final lat = (center['lat'] as num?)?.toDouble();
          final lng = (center['lng'] as num?)?.toDouble();
          if (lat != null && lng != null) {
            return _generateCirclePoints(LatLng(lat, lng), radiusMeters.toDouble());
          }
        }
      }
    } catch (e) {
      debugPrint('Error parsing geofence: $e');
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // Default center
    LatLng center = const LatLng(20.5937, 78.9629);
    if (_userLocation != null) {
      center = _userLocation!;
    } else if (_projects.isNotEmpty && _projects.first['latitude'] != null) {
      center = LatLng(
        double.parse(_projects.first['latitude'].toString()),
        double.parse(_projects.first['longitude'].toString()),
      );
    }

    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: Text('explore_projects'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: [
          // Radius toggle
          Row(
            children: [
              Text('show_radius'.tr(), style: theme.textTheme.bodySmall),
              Switch(
                value: _showRadius,
                onChanged: (v) => setState(() => _showRadius = v),
                activeColor: AppColors.primary,
              ),
            ],
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Map section
                Expanded(
                  flex: 3,
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(24),
                          bottomRight: Radius.circular(24),
                        ),
                        child: FlutterMap(
                          mapController: _mapController,
                          options: MapOptions(
                            initialCenter: center,
                            initialZoom: 12.0,
                          ),
                          children: [
                            // OSM tile layer (same as engineer dashboard)
                            TileLayer(
                              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                              userAgentPackageName: 'com.bharatbuild.app',
                            ),
                            // User radius circle
                            if (_showRadius && _userLocation != null)
                              PolygonLayer(
                                polygons: [
                                  Polygon(
                                    points: _generateCirclePoints(_userLocation!, _travelRadius),
                                    color: Colors.blue.withOpacity(0.1),
                                    borderColor: Colors.blue.withOpacity(0.5),
                                    borderStrokeWidth: 2,
                                  ),
                                ],
                              ),
                            // Project geofences
                            ..._projects.where((p) => p['geofence'] != null).map((project) {
                              final points = _parseGeofence(project['geofence']);
                              if (points != null && points.isNotEmpty) {
                                return PolygonLayer(
                                  polygons: [
                                    Polygon(
                                      points: points,
                                      color: AppColors.primary.withOpacity(0.2),
                                      borderColor: AppColors.primary,
                                      borderStrokeWidth: 2,
                                    ),
                                  ],
                                );
                              }
                              return const SizedBox.shrink();
                            }),
                            // Project markers
                            MarkerLayer(
                              markers: [
                                // User location marker
                                if (_userLocation != null)
                                  Marker(
                                    point: _userLocation!,
                                    width: 50,
                                    height: 50,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: Colors.blue.withOpacity(0.3),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Center(
                                        child: Container(
                                          width: 20,
                                          height: 20,
                                          decoration: BoxDecoration(
                                            color: Colors.blue,
                                            shape: BoxShape.circle,
                                            border: Border.all(color: Colors.white, width: 3),
                                            boxShadow: [
                                              BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 4),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                // Project markers
                                ..._projects
                                    .where((p) => p['latitude'] != null && p['longitude'] != null)
                                    .map((project) {
                                  final projectColor = _getProjectColor(project);
                                  return Marker(
                                    point: LatLng(
                                      double.parse(project['latitude'].toString()),
                                      double.parse(project['longitude'].toString()),
                                    ),
                                    width: 45,
                                    height: 45,
                                    child: GestureDetector(
                                      onTap: () {
                                        _mapController.move(
                                          LatLng(
                                            double.parse(project['latitude'].toString()),
                                            double.parse(project['longitude'].toString()),
                                          ),
                                          14.0,
                                        );
                                        _showProjectDetails(context, project);
                                      },
                                      child: Stack(
                                        alignment: Alignment.center,
                                        children: [
                                          Icon(
                                            Icons.location_on,
                                            color: projectColor.withOpacity(0.5),
                                            size: 45,
                                          ),
                                          Icon(
                                            Icons.location_on,
                                            color: projectColor,
                                            size: 35,
                                          ),
                                          Positioned(
                                            top: 6,
                                            child: Container(
                                              width: 10,
                                              height: 10,
                                              decoration: const BoxDecoration(
                                                color: Colors.white,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }),
                              ],
                            ),
                            // Attribution
                            RichAttributionWidget(
                              attributions: [
                                TextSourceAttribution('OpenStreetMap contributors'),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Change primary address button
                      Positioned(
                        left: 16,
                        bottom: 16,
                        child: ElevatedButton.icon(
                          onPressed: _updatePrimaryAddressToCurrent,
                          icon: const Icon(Icons.my_location, size: 18),
                          label: Text('set_current_as_primary'.tr(), style: const TextStyle(fontSize: 12)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.primary,
                            elevation: 4,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                        ),
                      ),
                      // Recenter button
                      Positioned(
                        right: 16,
                        bottom: 16,
                        child: FloatingActionButton.small(
                          heroTag: 'recenter_projects_map',
                          onPressed: () {
                            if (_userLocation != null) {
                              _mapController.move(_userLocation!, 13.0);
                            }
                          },
                          backgroundColor: Colors.white,
                          child: const Icon(Icons.center_focus_strong, color: Colors.blue),
                        ),
                      ),
                    ],
                  ),
                ),
                // Project list section
                Expanded(
                  flex: 2,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, -4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                          child: Text(
                            'nearby_projects'.tr(),
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ),
                        Expanded(
                          child: _projects.isEmpty
                              ? Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.map_outlined, size: 48, color: Colors.grey[400]),
                                      const SizedBox(height: 8),
                                      Text('no_projects_available'.tr(), style: theme.textTheme.bodyMedium),
                                    ],
                                  ),
                                )
                              : ListView.separated(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  itemCount: _projects.length,
                                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                                  itemBuilder: (context, index) {
                                    final project = _projects[index];
                                    final isInRange = _isWithinRadius(project);
                                    final projectColor = _getProjectColor(project);
                                    
                                    double? distanceMeters;
                                    if (_userLocation != null && project['latitude'] != null) {
                                      distanceMeters = _calculateDistance(
                                        _userLocation!,
                                        LatLng(
                                          double.parse(project['latitude'].toString()),
                                          double.parse(project['longitude'].toString()),
                                        ),
                                      );
                                    }

                                    return ListTile(
                                      onTap: () {
                                        // Focus map on project
                                        if (project['latitude'] != null) {
                                          _mapController.move(
                                            LatLng(
                                              double.parse(project['latitude'].toString()),
                                              double.parse(project['longitude'].toString()),
                                            ),
                                            14.0,
                                          );
                                        }
                                        _showProjectDetails(context, project);
                                      },
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                      tileColor: Colors.grey[50],
                                      leading: Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: projectColor.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Icon(
                                          Icons.business_rounded,
                                          color: projectColor,
                                        ),
                                      ),
                                      title: Text(
                                        project['name'] ?? 'Project',
                                        style: const TextStyle(fontWeight: FontWeight.w600),
                                      ),
                                      subtitle: Text(
                                        project['location_text'] ?? '',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(color: Colors.grey[600], fontSize: 12),
                                      ),
                                      trailing: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          if (distanceMeters != null)
                                            Text(
                                              _formatDistance(distanceMeters),
                                              style: TextStyle(
                                                color: projectColor,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                              ),
                                            ),
                                          if (!isInRange)
                                            Text(
                                              'too_far'.tr(),
                                              style: TextStyle(color: Colors.red[400], fontSize: 10),
                                            ),
                                          if (project['wage'] != null && double.parse(project['wage'].toString()) > 800)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: Colors.teal.withOpacity(0.1),
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: const Text('High Pay', style: TextStyle(color: Colors.teal, fontSize: 8, fontWeight: FontWeight.bold)),
                                            ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Color _getProjectColor(dynamic project) {
    if (!_isWithinRadius(project)) return Colors.grey;
    final wage = double.tryParse(project['wage']?.toString() ?? '0') ?? 0;
    if (wage > 800) return Colors.teal;
    return Colors.orange;
  }

  void _showProjectDetails(BuildContext context, dynamic project) {
    final theme = Theme.of(context);
    final isInRange = _isWithinRadius(project);
    
    double? distanceMeters;
    if (_userLocation != null && project['latitude'] != null) {
      distanceMeters = _calculateDistance(
        _userLocation!,
        LatLng(
          double.parse(project['latitude'].toString()),
          double.parse(project['longitude'].toString()),
        ),
      );
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
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
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(Icons.business_rounded, color: AppColors.primary, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          project['name'] ?? 'Project',
                          style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        if (project['location_text'] != null)
                          Text(
                            project['location_text'],
                            style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              // Distance
              if (distanceMeters != null)
                _detailRow(Icons.straighten, 'Distance', _formatDistance(distanceMeters), theme),
              // Wage
              if (project['wage'] != null)
                _detailRow(Icons.currency_rupee, 'daily_wages'.tr(), '₹${project['wage']}/day', theme),
              // Start date
              if (project['start_date'] != null)
                _detailRow(Icons.calendar_today, 'start_date'.tr(), project['start_date'].toString().split('T')[0], theme),
              const SizedBox(height: 20),
              // Apply button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: (isInRange && project['job'] != null) ? () => _applyToProject(project) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: (isInRange && project['job'] != null) ? AppColors.primary : Colors.grey[300],
                    foregroundColor: (isInRange && project['job'] != null) ? Colors.white : Colors.grey[600],
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Text(
                    project['job'] == null 
                      ? 'no_vacancy'.tr() 
                      : (isInRange ? 'apply_now'.tr() : 'too_far_to_apply'.tr()),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _detailRow(IconData icon, String label, String value, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Text(label, style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[600])),
          const Spacer(),
          Text(value, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Future<void> _applyToProject(dynamic project) async {
    final job = project['job'];
    if (job == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No active job recruitment for this project')),
      );
      return;
    }

    final jobId = job['id'].toString();
    
    try {
      // Show loading indicator in snackbar
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Row(
          children: [
            SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
            SizedBox(width: 16),
            Text('Applying...'),
          ],
        )),
      );

      await ref.read(applyForJobProvider(jobId).future);
      
      if (mounted) {
        Navigator.pop(context); // Close bottom sheet
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('applied_successfully'.tr())),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
}
