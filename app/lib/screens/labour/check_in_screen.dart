import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_map/flutter_map.dart';
import '../../providers/job_provider.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/auth_providers.dart';
import '../../services/auth_service.dart';
import '../../map/geofence_service.dart';
import '../../widgets/site_map_widget.dart';
import 'package:easy_localization/easy_localization.dart';
import 'shift_status_screen.dart';

class CheckInScreen extends ConsumerStatefulWidget {
  const CheckInScreen({super.key});

  @override
  ConsumerState<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends ConsumerState<CheckInScreen> {
  Position? _currentPosition;
  bool _isLoadingLocation = false;
  String? _selectedProjectId;
  Map<String, dynamic>? _selectedProject;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isLoadingLocation = true);
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Location permission is required')),
            );
          }
          return;
        }
      }
      
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _isLoadingLocation = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingLocation = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error getting location: $e')),
        );
      }
    }
  }

  Future<void> _handleCheckIn() async {
    if (_selectedProjectId == null || _currentPosition == null) return;

    final authService = ref.read(authServiceProvider);
    final geofenceService = GeofenceService();

    try {
      // Get project details with geofence
      final applications = await ref.read(myApplicationsProvider.future);
      final application = applications.firstWhere(
        (a) => a['project_id'].toString() == _selectedProjectId,
        orElse: () => null,
      );

      if (application == null) {
        throw Exception('Project not found');
      }

      final labourRequestId = application['labour_request_id']?.toString() ?? 
                              application['id']?.toString();
      
      if (labourRequestId == null) {
        throw Exception('Unable to find labour request ID');
      }

      final jobDetails = await authService.getJobDetails(labourRequestId);
      
      // Validate geofence
      final validation = geofenceService.validateGeofence(
        _currentPosition!.latitude,
        _currentPosition!.longitude,
        jobDetails,
      );
      
      if (!validation['isValid'] as bool) {
        final distance = validation['distance'] as int;
        final allowedRadius = validation['allowedRadius'] as int;
        
        if (mounted) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Outside Geofence'),
              content: Text(
                'You are ${distance.abs()}m ${distance < 0 ? 'inside' : 'away from'} the project site.\n\n'
                '${allowedRadius > 0 ? 'Allowed radius: ${allowedRadius}m\n\n' : ''}'
                'Please move closer to the project location to check in.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        }
        return;
      }
      
      // Proceed with check-in
      await ref.read(checkInProvider({
        'projectId': _selectedProjectId!,
        'lat': _currentPosition!.latitude,
        'lon': _currentPosition!.longitude,
      }).future);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Checked in successfully'),
            backgroundColor: Colors.green,
          ),
        );
        // Navigate to shift status screen
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const ShiftStatusScreen()),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final applicationsAsync = ref.watch(myApplicationsProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('check_in'.tr()),
      ),
      body: applicationsAsync.when(
        data: (applications) {
          // Show all projects regardless of status, but prioritize APPROVED
          final allProjects = List<Map<String, dynamic>>.from(applications);
          allProjects.sort((a, b) {
            final statusA = a['status'] as String? ?? '';
            final statusB = b['status'] as String? ?? '';
            if (statusA == 'APPROVED' && statusB != 'APPROVED') return -1;
            if (statusA != 'APPROVED' && statusB == 'APPROVED') return 1;
            return 0;
          });
          
          // For check-in, only allow APPROVED projects, but show all for reference
          final approvedProjects = allProjects.where((a) => a['status'] == 'APPROVED').toList();
          
          if (allProjects.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.work_off, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text('no_projects_found'.tr()),
                ],
              ),
            );
          }

          // Prepare projects data for map (show all projects, not just approved)
          final projectsForMap = allProjects.map((app) {
            return {
              'id': app['project_id'],
              'name': app['project_name'] ?? 'Project',
              'latitude': app['latitude'] ?? 0.0,
              'longitude': app['longitude'] ?? 0.0,
              'location_text': app['location_text'] ?? '',
              'geofence': app['geofence'],
            };
          }).toList();

          return Column(
            children: [
              // Map Section
              Expanded(
                flex: 2,
                child: Container(
                  margin: const EdgeInsets.all(16),
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
                    child: SiteMapWidget(
                      projectsData: projectsForMap,
                      geofences: [],
                    ),
                  ),
                ),
              ),
              
              // Project List Section
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'select_project'.tr(),
                        style: theme.textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: allProjects.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final app = allProjects[index];
                          final status = app['status'] as String? ?? '';
                          final isApproved = status == 'APPROVED';
                          final isPending = status == 'PENDING';
                          final isRejected = status == 'REJECTED';
                          final isSelected = _selectedProjectId == app['project_id'].toString();
                          
                          return Card(
                            elevation: isSelected ? 4 : 1,
                            color: isRejected 
                                ? Colors.grey.withOpacity(0.1)
                                : isPending
                                    ? Colors.orange.withOpacity(0.05)
                                    : null,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: BorderSide(
                                color: isSelected 
                                    ? theme.colorScheme.primary 
                                    : Colors.transparent,
                                width: 2,
                              ),
                            ),
                            child: InkWell(
                              onTap: isApproved ? () {
                                setState(() {
                                  _selectedProjectId = app['project_id'].toString();
                                  _selectedProject = app;
                                });
                              } : null,
                              borderRadius: BorderRadius.circular(16),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            app['project_name'] ?? 'Project',
                                            style: theme.textTheme.titleMedium?.copyWith(
                                              fontWeight: FontWeight.bold,
                                              color: isRejected 
                                                  ? Colors.grey
                                                  : null,
                                            ),
                                          ),
                                        ),
                                        // Status badge
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 4,
                                          ),
                                          decoration: BoxDecoration(
                                            color: isApproved
                                                ? Colors.green.withOpacity(0.1)
                                                : isPending
                                                    ? Colors.orange.withOpacity(0.1)
                                                    : Colors.grey.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            status,
                                            style: TextStyle(
                                              color: isApproved
                                                  ? Colors.green
                                                  : isPending
                                                      ? Colors.orange
                                                      : Colors.grey,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 11,
                                            ),
                                          ),
                                        ),
                                        if (isSelected && isApproved)
                                          const SizedBox(width: 8),
                                        if (isSelected && isApproved)
                                          Icon(
                                            Icons.check_circle,
                                            color: theme.colorScheme.primary,
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Icon(
                                          Icons.location_on,
                                          size: 16,
                                          color: theme.colorScheme.primary,
                                        ),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            app['location_text'] ?? 'Unknown Location',
                                            style: theme.textTheme.bodySmall,
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (app['distance_meters'] != null) ...[
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Icon(
                                            Icons.straighten,
                                            size: 16,
                                            color: Colors.grey,
                                          ),
                                          const SizedBox(width: 4),
                                          Text(
                                            '${app['distance_meters'].round()}m away',
                                            style: theme.textTheme.bodySmall?.copyWith(
                                              color: Colors.grey,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                    if (!isApproved) ...[
                                      const SizedBox(height: 8),
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: isPending
                                              ? Colors.orange.withOpacity(0.1)
                                              : Colors.grey.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Row(
                                          children: [
                                            Icon(
                                              isPending ? Icons.hourglass_empty : Icons.block,
                                              size: 16,
                                              color: isPending ? Colors.orange : Colors.grey,
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text(
                                                isPending
                                                    ? 'Waiting for approval'
                                                    : 'Application rejected',
                                                style: theme.textTheme.bodySmall?.copyWith(
                                                  color: isPending ? Colors.orange : Colors.grey,
                                                  fontStyle: FontStyle.italic,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              
              // Check-in Button
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surface,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    if (_isLoadingLocation)
                      const LinearProgressIndicator()
                    else if (_currentPosition == null)
                      ElevatedButton.icon(
                        onPressed: _getCurrentLocation,
                        icon: const Icon(Icons.location_searching),
                        label: const Text('Get Location'),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 50),
                        ),
                      )
                    else
                      Column(
                        children: [
                          Row(
                            children: [
                              Icon(Icons.my_location, size: 16, color: Colors.green),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Location: ${_currentPosition!.latitude.toStringAsFixed(6)}, ${_currentPosition!.longitude.toStringAsFixed(6)}',
                                  style: theme.textTheme.bodySmall,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: _selectedProjectId == null ? null : _handleCheckIn,
                            style: ElevatedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 50),
                              backgroundColor: theme.colorScheme.primary,
                            ),
                            child: Text(
                              'check_in'.tr(),
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
