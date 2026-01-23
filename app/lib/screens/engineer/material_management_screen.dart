import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/material_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/current_project_provider.dart';
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
    _tabController = TabController(length: 3, vsync: this);
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
            Tab(text: 'inventory'.tr()),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRequestsList(),
          _buildBillsList(),
          _buildInventoryList(),
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
        return RefreshIndicator(
          onRefresh: () async => ref.refresh(materialRequestsProvider.future),
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: requests.length,
            itemBuilder: (context, index) {
              final req = requests[index];
              return _buildRequestCard(req);
            },
          ),
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
        return RefreshIndicator(
          onRefresh: () async => ref.refresh(materialBillsProvider.future),
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: bills.length,
            itemBuilder: (context, index) {
              final bill = bills[index];
              return _buildBillCard(bill);
            },
          ),
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

  Widget _buildInventoryList() {
    final stockAsync = ref.watch(projectStockProvider);
    return stockAsync.when(
      data: (stock) {
        if (stock.isEmpty) {
          return Center(child: Text('no_materials_in_stock'.tr()));
        }
        return RefreshIndicator(
          onRefresh: () async => ref.refresh(projectStockProvider.future),
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: stock.length,
            itemBuilder: (context, index) {
              final item = stock[index];
              return _buildInventoryCard(item);
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(child: Text('Error: $err')),
    );
  }

  Widget _buildInventoryCard(Map<String, dynamic> item) {
    final theme = Theme.of(context);
    final currentStock = double.tryParse(item['current_stock'].toString()) ?? 0.0;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        title: Text(item['material_name'] ?? 'Unknown Material'),
        subtitle: Text('${item['category']}'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '$currentStock',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: currentStock > 0 ? Colors.green : Colors.red,
              ),
            ),
            Text(item['unit'] ?? '', style: theme.textTheme.bodySmall),
          ],
        ),
        onTap: () => _issueMaterial(item),
      ),
    );
  }

  void _issueMaterial(Map<String, dynamic> item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _IssueMaterialSheet(item: item),
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
            ListTile(
              leading: const Icon(Icons.inventory_2_outlined),
              title: Text('record_movement'.tr()),
              onTap: () {
                Navigator.pop(context);
                // We'll show the generic movement dialog
                _issueMaterial({});
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _IssueMaterialSheet extends ConsumerStatefulWidget {
  final Map<String, dynamic> item;
  const _IssueMaterialSheet({required this.item});

  @override
  ConsumerState<_IssueMaterialSheet> createState() => _IssueMaterialSheetState();
}

class _IssueMaterialSheetState extends ConsumerState<_IssueMaterialSheet> {
  final _qtyController = TextEditingController();
  final _nameController = TextEditingController();
  final _remarksController = TextEditingController();
  String _movementType = 'OUT';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController.text = widget.item['material_name'] ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'record_movement'.tr(),
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 24),
            
            _buildTypeSelector(),
            const SizedBox(height: 20),
            
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'material_name'.tr(),
                prefixIcon: const Icon(Icons.inventory_2_outlined),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              enabled: widget.item['material_name'] == null,
            ),
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _qtyController,
              decoration: InputDecoration(
                labelText: 'quantity'.tr(),
                prefixIcon: const Icon(Icons.numbers),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            
            TextFormField(
              controller: _remarksController,
              decoration: InputDecoration(
                labelText: 'remarks'.tr(),
                prefixIcon: const Icon(Icons.notes),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 32),
            
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) 
                  : Text('submit'.tr()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeSelector() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: ['IN', 'OUT', 'ADJUSTMENT'].map((type) {
          final isSelected = _movementType == type;
          return Expanded(
            child: InkWell(
              onTap: () => setState(() => _movementType = type),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: isSelected ? [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))
                  ] : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  type,
                  style: TextStyle(
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected ? AppColors.primary : Colors.grey,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Future<void> _submit() async {
    if (_qtyController.text.isEmpty) return;
    
    setState(() => _isLoading = true);
    final project = ref.read(currentProjectProvider);
    
    final data = {
      'project_id': project!['id'],
      'material_name': _nameController.text,
      'category': widget.item['category'] ?? 'General',
      'quantity': double.parse(_qtyController.text),
      'unit': widget.item['unit'] ?? 'Units',
      'movement_type': _movementType,
      'remarks': _remarksController.text,
    };

    final success = await ref.read(recordMovementProvider(data).future);
    
    if (mounted) {
      setState(() => _isLoading = false);
      Navigator.pop(context);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('movement_recorded'.tr()), backgroundColor: Colors.green));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('queued_offline'.tr()), backgroundColor: Colors.orange));
      }
    }
  }
}
