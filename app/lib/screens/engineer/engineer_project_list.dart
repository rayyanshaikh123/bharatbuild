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
  String? _error;
  String? _orgId;

  @override
  void initState() {
    super.initState();
    _fetchProjects();
  }

  Future<void> _fetchProjects() async {
    try {
      final auth = ref.read(authServiceProvider);
      // First get current org ID
      final orgData = await auth.getCurrentOrganization();
      final orgs = orgData['organizations'] as List;
      
      if (orgs.isEmpty) {
        setState(() {
          _error = 'You must join an organization first.';
          _isLoading = false;
        });
        return;
      }
      
      _orgId = orgs.first['id'].toString();
      
      final projects = await auth.getOrgProjects(_orgId!);
      
      if (mounted) {
        setState(() {
          _projects = projects;
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
          SnackBar(content: Text('request_sent'.tr()), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
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
              : _projects.isEmpty
                  ? Center(child: Text('no_projects_found'.tr()))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: _projects.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final project = _projects[index];
                        return Card(
                          child: ListTile(
                            title: Text(project['name'] ?? 'Untitled'),
                            subtitle: Text(project['location_text'] ?? 'No location'),
                            trailing: ElevatedButton(
                              onPressed: () => _requestJoin(project['id'].toString()),
                              child: Text('join'.tr()),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
