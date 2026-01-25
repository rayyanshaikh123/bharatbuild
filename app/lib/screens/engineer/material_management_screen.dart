import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../providers/material_provider.dart';
import '../../providers/project_provider.dart';
import '../../providers/inventory_provider.dart';
import '../../providers/current_project_provider.dart';
import '../../providers/material_stock_provider.dart';
import '../../theme/app_colors.dart';
import 'material_request_form.dart';
import 'material_exchange_screen.dart';

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
            Tab(text: 'inventory'.tr()),
            Tab(text: 'Stock'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRequestsList(),
          _buildInventoryList(),
          _buildStockAvailability(),
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
          ],
        ),
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
              leading: const Icon(Icons.swap_horiz),
              title: const Text('Material Exchange'),
              subtitle: const Text('Record usage, transfer, or adjust stock'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const MaterialExchangeScreen()),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.inventory_2_outlined),
              title: Text('record_movement'.tr()),
              onTap: () {
                Navigator.pop(context);
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

  Widget _buildStockAvailability() {
    final currentProject = ref.watch(currentProjectProvider);
    
    if (currentProject == null) {
      return const Center(child: Text('No project selected'));
    }

    final projectId = currentProject['id'] as String;
    final stockAsync = ref.watch(materialStockProvider(projectId));

    return stockAsync.when(
      data: (stockList) {
        if (stockList.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey[400]),
                const SizedBox(height: 16),
                Text(
                  'No material stock available',
                  style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                ),
                const SizedBox(height: 8),
                Text(
                  'Stock will appear here after materials are received',
                  style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(materialStockProvider(projectId));
          },
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            itemCount: stockList.length,
            itemBuilder: (context, index) {
              final stock = stockList[index];
              return _buildStockCard(stock);
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (err, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text('Error loading stock: $err', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.invalidate(materialStockProvider(projectId)),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStockCard(stock) {
    final theme = Theme.of(context);
    final availableQty = stock.availableQuantity;
    final isLowStock = availableQty < 10; // Simple threshold

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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        stock.materialName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (stock.category != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            stock.category!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isLowStock ? Colors.orange.withOpacity(0.1) : Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isLowStock ? Colors.orange : Colors.green,
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${availableQty.toStringAsFixed(2)} ${stock.unit}',
                        style: TextStyle(
                          color: isLowStock ? Colors.orange[700] : Colors.green[700],
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Row(
              children: [
                Expanded(
                  child: _buildStockStat(
                    'Received',
                    stock.totalReceived.toStringAsFixed(2),
                    stock.unit,
                    Icons.arrow_downward,
                    Colors.blue,
                  ),
                ),
                Expanded(
                  child: _buildStockStat(
                    'Consumed',
                    stock.totalConsumed.toStringAsFixed(2),
                    stock.unit,
                    Icons.arrow_upward,
                    Colors.red,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () => _showStockExchangeDialog(stock),
                  icon: const Icon(Icons.swap_horiz, size: 18),
                  label: const Text('Record Usage'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStockStat(String label, String value, String unit, IconData icon, Color color) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          '$value $unit',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  void _showStockExchangeDialog(stock) {
    final quantityController = TextEditingController();
    final remarksController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Record Material Usage'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                stock.materialName,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Available: ${stock.availableQuantity.toStringAsFixed(2)} ${stock.unit}',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: quantityController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Quantity Used',
                  hintText: 'Enter quantity',
                  suffixText: stock.unit,
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: remarksController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Remarks (Optional)',
                  hintText: 'Purpose of usage',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 20, color: Colors.blue[700]),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Usage will be recorded and deducted from stock',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue[700],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final quantity = double.tryParse(quantityController.text);
              if (quantity == null || quantity <= 0) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter a valid quantity'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }
              
              if (quantity > stock.availableQuantity) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Quantity exceeds available stock (${stock.availableQuantity.toStringAsFixed(2)} ${stock.unit})',
                    ),
                    backgroundColor: Colors.orange,
                  ),
                );
                return;
              }
              
              Navigator.pop(context);
              _recordMaterialUsage(
                stock.materialName,
                quantity,
                stock.unit,
                remarksController.text,
              );
            },
            child: const Text('Record Usage'),
          ),
        ],
      ),
    );
  }

  Future<void> _recordMaterialUsage(
    String materialName,
    double quantity,
    String unit,
    String remarks,
  ) async {
    final currentProject = ref.read(currentProjectProvider);
    if (currentProject == null) return;

    // Show loading
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            ),
            SizedBox(width: 16),
            Text('Recording material usage...'),
          ],
        ),
        duration: Duration(seconds: 2),
      ),
    );

    // In a real app, this would call an API endpoint to record the usage
    // For now, we'll just show a success message and refresh the stock
    await Future.delayed(const Duration(seconds: 1));

    if (mounted) {
      // Refresh the stock data
      ref.invalidate(materialStockProvider(currentProject['id'] as String));
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Recorded: $quantity $unit of $materialName',
          ),
          backgroundColor: Colors.green,
          action: SnackBarAction(
            label: 'Undo',
            textColor: Colors.white,
            onPressed: () {
              // Implement undo logic if needed
            },
          ),
        ),
      );
    }
  }
}

