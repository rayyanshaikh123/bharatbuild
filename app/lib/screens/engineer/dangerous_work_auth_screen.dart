import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:intl/intl.dart';
import '../../services/dangerous_work_service.dart';
import '../../providers/auth_providers.dart';
import '../../providers/user_provider.dart';
import '../../providers/project_provider.dart';
import '../../theme/app_colors.dart';

class DangerousWorkAuthorizationScreen extends ConsumerStatefulWidget {
  const DangerousWorkAuthorizationScreen({super.key});

  @override
  ConsumerState<DangerousWorkAuthorizationScreen> createState() => _DangerousWorkAuthorizationScreenState();
}

class _DangerousWorkAuthorizationScreenState extends ConsumerState<DangerousWorkAuthorizationScreen> with SingleTickerProviderStateMixin {
  bool _isLoading = false;
  List<dynamic> _requests = [];
  List<dynamic> _templates = [];
  Map<String, dynamic>? _selectedProject;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    _loadInitialData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() => _isLoading = true);
    try {
      final projects = await ref.read(engineerProjectsProvider.future);
      if (projects.isNotEmpty && mounted) {
        setState(() {
          _selectedProject = projects.first;
        });
        await _loadData(projects.first['project_id'].toString());
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _loadData(String projectId) async {
    setState(() => _isLoading = true);
    try {
      final service = ref.read(dangerousWorkServiceProvider);
      final results = await Future.wait([
        service.getProjectRequests(projectId),
        service.getTaskTemplates(projectId),
      ]);
      
      if (mounted) {
        setState(() {
          _requests = results[0];
          _templates = results[1];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _handleAuthorize(String requestId) async {
    final TextEditingController otpController = TextEditingController();
    
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Authorize Dangerous Work'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Enter the Safety OTP provided by the labourer:'),
            const SizedBox(height: 16),
            TextField(
              controller: otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 8),
              textAlign: TextAlign.center,
              decoration: const InputDecoration(
                hintText: '000000',
                counterText: '',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            child: const Text('Authorize'),
          ),
        ],
      ),
    );

    if (confirmed == true && otpController.text.length == 6) {
      setState(() => _isLoading = true);
      try {
        final service = ref.read(dangerousWorkServiceProvider);
        await service.authorizeRequest(requestId, otpController.text);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Safety Authorization Successful!'), backgroundColor: Colors.green));
          if (_selectedProject != null) _loadData(_selectedProject!['project_id'].toString());
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Authorization Failed: $e'), backgroundColor: Colors.red));
        }
      }
    }
  }

  Future<void> _handleCreateTemplate() async {
    if (_selectedProject == null) return;
    
    final nameController = TextEditingController();
    final descController = TextEditingController();
    
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New Dangerous Task'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
             TextField(
               controller: nameController,
               decoration: const InputDecoration(labelText: 'Task Name', hintText: 'e.g., High Altitude Welding'),
               textCapitalization: TextCapitalization.words,
             ),
             const SizedBox(height: 12),
             TextField(
               controller: descController,
               decoration: const InputDecoration(labelText: 'Safety Description', hintText: 'e.g., Ensure harness and safety net'),
               maxLines: 2,
             ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Create'),
          ),
        ],
      ),
    );

    if (confirmed == true && nameController.text.isNotEmpty) {
      setState(() => _isLoading = true);
      try {
        final service = ref.read(dangerousWorkServiceProvider);
        await service.createTaskTemplate(
          _selectedProject!['project_id'].toString(),
          nameController.text,
          descController.text,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task template created!'), backgroundColor: Colors.green));
          _loadData(_selectedProject!['project_id'].toString());
        }
      } catch (e) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Safety Management'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Authorization'),
            Tab(text: 'Task Templates'),
          ],
        ),
        actions: [
          if (_selectedProject != null)
            IconButton(onPressed: () => _loadData(_selectedProject!['project_id'].toString()), icon: const Icon(Icons.refresh)),
        ],
      ),
      body: Column(
        children: [
          _buildProjectSelector(theme),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _isLoading 
                  ? const Center(child: CircularProgressIndicator())
                  : _requests.isEmpty 
                      ? _buildEmptyState(theme, 'No pending safety requests')
                      : _buildRequestsList(theme),
                _isLoading 
                  ? const Center(child: CircularProgressIndicator())
                  : _buildTemplatesList(theme),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: _tabController.index == 1 ? FloatingActionButton.extended(
        onPressed: _handleCreateTemplate,
        label: const Text('Define Task'),
        icon: const Icon(Icons.add_moderator),
        backgroundColor: Colors.orange,
      ) : null,
    );
  }

  void _showProjectPicker() {
    final projectsAsync = ref.read(engineerProjectsProvider);
    projectsAsync.whenData((projects) {
      showModalBottomSheet(
        context: context,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        builder: (context) => Container(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('select_site'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 16),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: projects.length,
                  itemBuilder: (context, index) {
                    final p = projects[index];
                    return ListTile(
                      leading: const Icon(Icons.business, color: Colors.orange),
                      title: Text(p['name'] ?? 'Project'),
                      subtitle: Text(p['location_text'] ?? ''),
                      onTap: () {
                        Navigator.pop(context);
                        setState(() => _selectedProject = p);
                        _loadData(p['project_id'].toString());
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    });
  }

  Widget _buildProjectSelector(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.primaryContainer.withOpacity(0.1),
        border: Border(bottom: BorderSide(color: theme.dividerColor.withOpacity(0.1))),
      ),
      child: Row(
        children: [
          const Icon(Icons.business, color: Colors.orange),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _selectedProject == null ? 'Please select a project' : 'Viewing Site:',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                if (_selectedProject != null)
                  Text(
                    _selectedProject!['name'] ?? 'Unknown Project',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _showProjectPicker,
            child: const Text('Change Site'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme, String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.fact_check_outlined, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            _selectedProject == null ? 'Select a project to start' : message,
            style: TextStyle(color: Colors.grey[600], fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildRequestsList(ThemeData theme) {
    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: _requests.length,
      separatorBuilder: (_, __) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final req = _requests[index];
        return Card(
          elevation: 0,
          color: theme.cardColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: theme.dividerColor.withOpacity(0.1)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.orange.withOpacity(0.1), shape: BoxShape.circle),
                      child: const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(req['task_name'] ?? 'Dangerous Task', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                          Text(req['labour_name'] ?? 'Unknown Labourer', style: theme.textTheme.bodySmall?.copyWith(color: Colors.blue, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    _buildStatusBadge('REQUESTED'),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Requested: ${DateFormat('hh:mm a').format(DateTime.parse(req['requested_at']))}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.verified_user_outlined, size: 18),
                      label: const Text('Verify OTP'),
                      onPressed: () => _handleAuthorize(req['id'].toString()),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTemplatesList(ThemeData theme) {
    if (_templates.isEmpty) return _buildEmptyState(theme, 'No dangerous tasks defined yet');
    
    return ListView.separated(
      padding: const EdgeInsets.all(20),
      itemCount: _templates.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final task = _templates[index];
        return ListTile(
          tileColor: theme.cardColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: theme.dividerColor.withOpacity(0.1)),
          ),
          leading: const Icon(Icons.security, color: Colors.orange),
          title: Text(task['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text(task['description'] ?? 'No description provided'),
          trailing: Switch(
            value: task['is_active'] ?? true,
            activeColor: Colors.green,
            onChanged: (val) {
               // Placeholder for toggle status functionality
            },
          ),
        );
      },
    );
  }

  Widget _buildStatusBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(color: Colors.blue.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
      child: Text(status, style: const TextStyle(color: Colors.blue, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }
}
