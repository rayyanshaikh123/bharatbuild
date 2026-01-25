import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../theme/app_colors.dart';
import '../../providers/engineer_attendance_provider.dart';
import '../../providers/current_project_provider.dart';

class SemiManualAttendanceScreen extends ConsumerStatefulWidget {
  const SemiManualAttendanceScreen({super.key});

  @override
  ConsumerState<SemiManualAttendanceScreen> createState() => _SemiManualAttendanceScreenState();
}

class _SemiManualAttendanceScreenState extends ConsumerState<SemiManualAttendanceScreen> {
  final _searchController = TextEditingController();
  bool _isSearching = false;
  Map<String, dynamic>? _foundLabour;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _searchLabour() async {
    if (_searchController.text.length < 10) return;
    
    setState(() {
      _isSearching = true;
      _foundLabour = null;
    });

    try {
      final labour = await ref.read(engineerSearchLabourProvider(_searchController.text.trim()).future);
      setState(() => _foundLabour = labour);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('labourer_not_found'.tr()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  Future<void> _markAttendance(String labourId, String status) async {
    final project = ref.read(currentProjectProvider);
    if (project == null) return;

    try {
      final success = await ref.read(engineerMarkAttendanceProvider({
        'labourId': labourId,
        'projectId': (project['project_id'] ?? project['id']).toString(),
        'status': status,
      }).future);
      
      if (!mounted) return;
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('attendance_marked_successfully'.tr()), backgroundColor: Colors.green),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('attendance_queued_offline'.tr()), backgroundColor: Colors.orange),
        );
      }
      
      if (_foundLabour != null) {
        setState(() => _foundLabour = null);
        _searchController.clear();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('error'.tr() + ': $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final attendanceAsync = ref.watch(engineerTodayAttendanceProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('semi_manual_attendance'.tr()),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      hintText: 'search_by_phone'.tr(),
                      prefixIcon: const Icon(Icons.phone),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onSubmitted: (_) => _searchLabour(),
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _isSearching ? null : _searchLabour,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.all(16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSearching 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.search),
                ),
              ],
            ),
          ),

          if (_foundLabour != null) _buildFoundLabourCard(theme),

          const Divider(),
          
          Expanded(
            child: attendanceAsync.when(
              data: (list) {
                if (list.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.people_outline, size: 64, color: Colors.grey.withOpacity(0.5)),
                        const SizedBox(height: 16),
                        Text('no_attendance_records'.tr()),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.refresh(engineerTodayAttendanceProvider.future),
                  child: ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = list[index];
                      return _AttendanceListItem(
                        item: item,
                        onMark: (status) => _markAttendance(item['labour_id'].toString(), status),
                      );
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, _) => Center(child: Text('Error: $err')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFoundLabourCard(ThemeData theme) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: AppColors.primary,
            child: Text(_foundLabour!['name'][0].toUpperCase(), style: const TextStyle(color: Colors.white)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_foundLabour!['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(_foundLabour!['phone'], style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () => _markAttendance(_foundLabour!['id'].toString(), 'APPROVED'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            child: Text('mark_present'.tr()),
          ),
        ],
      ),
    );
  }
}

class _AttendanceListItem extends StatelessWidget {
  final Map<String, dynamic> item;
  final Function(String) onMark;

  const _AttendanceListItem({required this.item, required this.onMark});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = item['status'] ?? 'PENDING';
    
    Color statusColor = Colors.orange;
    if (status == 'APPROVED') statusColor = Colors.green;
    if (status == 'REJECTED') statusColor = Colors.red;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outline.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(item['skill_type'] ?? '', style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          if (status == 'PENDING') ...[
            IconButton(
              onPressed: () => onMark('REJECTED'),
              icon: const Icon(Icons.close, color: Colors.red),
            ),
            IconButton(
              onPressed: () => onMark('APPROVED'),
              icon: const Icon(Icons.check, color: Colors.green),
            ),
          ] else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                status,
                style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
    );
  }
}
