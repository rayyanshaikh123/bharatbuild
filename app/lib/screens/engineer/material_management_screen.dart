import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/material_provider.dart';
import '../../providers/project_provider.dart';
import '../../theme/app_colors.dart';
import 'material_request_form.dart';
import 'upload_bill_form.dart';

class MaterialManagementScreen extends ConsumerStatefulWidget {
  const MaterialManagementScreen({super.key});

  @override
  ConsumerState<MaterialManagementScreen> createState() => _MaterialManagementScreenState();
}

class _MaterialManagementScreenState extends ConsumerState<MaterialManagementScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('material_management'.tr()),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'requests'.tr()),
            Tab(text: 'bills'.tr()),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRequestsList(),
          _buildBillsList(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showActionSheet(context),
        label: Text('new_request'.tr()),
        icon: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildRequestsList() {
    final requestsAsync = ref.watch(materialRequestsProvider);
    return requestsAsync.when(
      data: (requests) {
        if (requests.isEmpty) {
          return Center(child: Text('no_materials'.tr()));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: requests.length,
          itemBuilder: (context, index) {
            final req = requests[index];
            return _buildRequestCard(req);
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Error: $err')),
    );
  }

  Widget _buildBillsList() {
    final billsAsync = ref.watch(materialBillsProvider);
    return billsAsync.when(
      data: (bills) {
        if (bills.isEmpty) {
          return Center(child: Text('no_materials'.tr()));
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: bills.length,
          itemBuilder: (context, index) {
            final bill = bills[index];
            return _buildBillCard(bill);
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Error: $err')),
    );
  }

  Widget _buildRequestCard(Map<String, dynamic> req) {
    final theme = Theme.of(context);
    final status = req['status'] as String;
    final color = status == 'APPROVED' ? Colors.green : (status == 'REJECTED' ? Colors.red : Colors.orange);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    req['title'] ?? 'Untitled',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                _statusBadge(status, color),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${req['category']} • ${req['quantity']}',
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
            ),
            if (req['description'] != null && req['description'].isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                req['description'],
                style: theme.textTheme.bodySmall,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 12),
            if (status == 'APPROVED')
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => UploadBillForm(request: req),
                      ),
                    );
                  },
                  icon: const Icon(Icons.upload_file, size: 18),
                  label: Text('upload_bill'.tr()),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.primaryContainer,
                    foregroundColor: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBillCard(Map<String, dynamic> bill) {
    final theme = Theme.of(context);
    final status = bill['status'] as String;
    final color = status == 'APPROVED' ? Colors.green : (status == 'REJECTED' ? Colors.red : Colors.orange);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        title: Text(bill['vendor_name'] ?? 'Unknown Vendor'),
        subtitle: Text('Amt: ₹${bill['total_amount']} • ${bill['category']}'),
        trailing: _statusBadge(status, color),
        onTap: () {
          // Show bill details
        },
      ),
    );
  }

  Widget _statusBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Text(
        label.tr(),
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
      ),
    );
  }

  void _showActionSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.add_shopping_cart),
              title: Text('request_material'.tr()),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const MaterialRequestForm()),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long),
              title: Text('upload_bill'.tr()),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const UploadBillForm()),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
