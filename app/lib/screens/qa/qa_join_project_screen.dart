import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/qa_provider.dart';
import '../../services/qa_service.dart';

class QAJoinProjectScreen extends ConsumerStatefulWidget {
  const QAJoinProjectScreen({super.key});

  @override
  ConsumerState<QAJoinProjectScreen> createState() => _QAJoinProjectScreenState();
}

class _QAJoinProjectScreenState extends ConsumerState<QAJoinProjectScreen> {
  bool _isLoading = true;
  List<dynamic> _projects = [];
  List<dynamic> _filteredProjects = [];
  String? _error;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchProjects();
    _searchController.addListener(_filterProjects);
  }

  @override
  void dispose() {
    _searchController.removeListener(_filterProjects);
    _searchController.dispose();
    super.dispose();
  }

  void _filterProjects() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredProjects = _projects;
      } else {
        _filteredProjects = _projects.where((p) {
          final name = (p['name'] ?? '').toString().toLowerCase();
          final location = (p['location_text'] ?? '').toString().toLowerCase();
          return name.contains(query) || location.contains(query);
        }).toList();
      }
    });
  }

  Future<void> _fetchProjects() async {
    try {
      final auth = ref.read(qaServiceProvider);
      
      // Fetch projects (automatically uses approved org)
      final projects = await auth.getOrgProjects();
      
      // Also fetch my requests to check status
      final myRequests = await auth.getMyProjectRequests();
      
      // Compute status for each project
      final projectsWithStatus = projects.map((p) {
        final req = myRequests.firstWhere((r) => r['project_id'] == p['id'], orElse: () => null);
        final pMap = Map<String, dynamic>.from(p);
        if (req != null) {
          pMap['request_status'] = req['status'];
        }
        return pMap;
      }).toList();

      if (mounted) {
        setState(() {
          _projects = projectsWithStatus;
          _filteredProjects = projectsWithStatus;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _requestJoin(String projectId) async {
    try {
      await ref.read(qaServiceProvider).joinProject(projectId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Project join request submitted. Waiting for manager approval.'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
        // Refresh the list to show updated status
        _fetchProjects();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to join: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Join Project')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.warning_amber_rounded, size: 64, color: Colors.orange),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.red),
                  textAlign: TextAlign.center,
                ),
              ),
              if (_error!.contains('organization') || _error!.contains('approved'))
                ElevatedButton(
                  onPressed: () => Navigator.pushNamed(context, '/qa-organization'),
                  child: const Text('Join Organization'),
                ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Join Project'),
        elevation: 0,
      ),
      body: Column(
        children: [
          Padding(
             padding: const EdgeInsets.all(16.0),
             child: TextField(
               controller: _searchController,
               decoration: InputDecoration(
                 hintText: 'Search projects',
                 prefixIcon: const Icon(Icons.search),
                 border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                 filled: true,
                 fillColor: Colors.grey.shade100,
               ),
             ),
          ),
          Expanded(
            child: _filteredProjects.isEmpty 
              ? const Center(child: Text('No available projects found in your organization.'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _filteredProjects.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final project = _filteredProjects[index];
                    final status = project['request_status'];
                    final isPending = status == 'PENDING';
                    final isApproved = status == 'APPROVED' || status == 'ACTIVE';
                    
                    return Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.grey.shade300),
                      ),
                      child: ListTile(
                        title: Text(project['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(project['location_text'] ?? 'No location'),
                        trailing: isApproved 
                          ? const Icon(Icons.check_circle, color: Colors.green)
                          : isPending
                              ? const Text('Pending', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold))
                              : ElevatedButton(
                                  onPressed: () => _requestJoin(project['id']),
                                  child: const Text('Join'),
                                ),
                      ),
                    );
                  },
                ),
          ),
        ],
      ),
    );
  }
}
