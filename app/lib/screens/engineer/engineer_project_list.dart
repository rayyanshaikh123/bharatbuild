import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/auth_providers.dart';
import '../../providers/organization_provider.dart';

class EngineerProjectListScreen extends ConsumerStatefulWidget {
  const EngineerProjectListScreen({super.key});

  @override
  ConsumerState<EngineerProjectListScreen> createState() => _EngineerProjectListScreenState();
}

class _EngineerProjectListScreenState extends ConsumerState<EngineerProjectListScreen> {
  bool _isLoading = true;
  List<dynamic> _projects = [];
  List<dynamic> _filteredProjects = [];
  String? _error;
  String? _orgId;
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
      final auth = ref.read(authServiceProvider);
      // Get current organization
      final orgData = await auth.getCurrentOrganization();
      final orgs = orgData['organizations'] as List;
      
      if (orgs.isEmpty) {
        setState(() {
          _error = 'You must join an organization first.';
          _isLoading = false;
        });
        return;
      }
      
      // Engineer can only apply to projects of an organization they are in
      _orgId = orgs.first['id'].toString();
      
      final projects = await auth.getOrgProjects(_orgId!);
      
      if (mounted) {
        setState(() {
          _projects = projects;
          _filteredProjects = projects;
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
    if (_orgId == null) return;
    try {
      await ref.read(authServiceProvider).joinProject(projectId, _orgId!);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Project join request submitted. Waiting for manager approval.'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
        // Refresh the list to show updated status
        _fetchProjects();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('join_project'.tr())),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'search_projects'.tr(),
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: _filteredProjects.isEmpty
                          ? Center(child: Text('no_projects_found'.tr()))
                          : RefreshIndicator(
                              onRefresh: _fetchProjects,
                              child: ListView.separated(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                itemCount: _filteredProjects.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 12),
                                itemBuilder: (context, index) {
                                  final project = _filteredProjects[index];
                                  return Card(
                                    elevation: 2,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    child: ListTile(
                                      contentPadding: const EdgeInsets.all(16),
                                      title: Text(
                                        project['name'] ?? 'Untitled',
                                        style: const TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                      subtitle: Text(project['location_text'] ?? 'No location'),
                                      trailing: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        ),
                                        onPressed: () => _requestJoin(project['id'].toString()),
                                        child: Text('join'.tr()),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                    ),
                  ],
                ),
    );
  }
}
