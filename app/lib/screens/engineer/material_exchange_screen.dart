import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/current_project_provider.dart';
import '../../providers/material_stock_provider.dart';
import '../../theme/app_colors.dart';

class MaterialExchangeScreen extends ConsumerStatefulWidget {
  const MaterialExchangeScreen({super.key});

  @override
  ConsumerState<MaterialExchangeScreen> createState() => _MaterialExchangeScreenState();
}

class _MaterialExchangeScreenState extends ConsumerState<MaterialExchangeScreen> {
  String? selectedMaterial;
  final quantityController = TextEditingController();
  final remarksController = TextEditingController();
  String exchangeType = 'USAGE'; // USAGE, TRANSFER, ADJUSTMENT

  @override
  void dispose() {
    quantityController.dispose();
    remarksController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentProject = ref.watch(currentProjectProvider);
    
    if (currentProject == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Material Exchange')),
        body: const Center(child: Text('No project selected')),
      );
    }

    final projectId = currentProject['id'] as String;
    final stockAsync = ref.watch(materialStockProvider(projectId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Material Exchange'),
        backgroundColor: AppColors.primary,
      ),
      body: stockAsync.when(
        data: (stockList) => _buildExchangeForm(stockList),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.red[300]),
              const SizedBox(height: 16),
              Text('Error: $err'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(materialStockProvider(projectId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildExchangeForm(List stockList) {
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
          ],
        ),
      );
    }

    final selectedStock = selectedMaterial != null
        ? stockList.firstWhere(
            (s) => s.materialName == selectedMaterial,
            orElse: () => stockList[0],
          )
        : stockList[0];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Exchange Type Selector
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Exchange Type',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: [
                      ChoiceChip(
                        label: const Text('Usage'),
                        selected: exchangeType == 'USAGE',
                        onSelected: (selected) {
                          setState(() => exchangeType = 'USAGE');
                        },
                      ),
                      ChoiceChip(
                        label: const Text('Transfer'),
                        selected: exchangeType == 'TRANSFER',
                        onSelected: (selected) {
                          setState(() => exchangeType = 'TRANSFER');
                        },
                      ),
                      ChoiceChip(
                        label: const Text('Adjustment'),
                        selected: exchangeType == 'ADJUSTMENT',
                        onSelected: (selected) {
                          setState(() => exchangeType = 'ADJUSTMENT');
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Material Selector
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Select Material',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: selectedMaterial ?? stockList[0].materialName,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.inventory),
                    ),
                    items: stockList.map<DropdownMenuItem<String>>((stock) {
                      return DropdownMenuItem(
                        value: stock.materialName,
                        child: Text(stock.materialName),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() => selectedMaterial = value);
                    },
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.green.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.check_circle, size: 20, color: Colors.green[700]),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Available: ${selectedStock.availableQuantity.toStringAsFixed(2)} ${selectedStock.unit}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.green[700],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Quantity Input
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Quantity',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: quantityController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      border: const OutlineInputBorder(),
                      prefixIcon: const Icon(Icons.numbers),
                      suffixText: selectedStock.unit,
                      hintText: 'Enter quantity',
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Remarks
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Remarks',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: remarksController,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.note),
                      hintText: 'Purpose of exchange/usage',
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Submit Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton.icon(
              onPressed: _submitExchange,
              icon: const Icon(Icons.send),
              label: Text(_getSubmitButtonText()),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getSubmitButtonText() {
    switch (exchangeType) {
      case 'USAGE':
        return 'Record Usage';
      case 'TRANSFER':
        return 'Request Transfer';
      case 'ADJUSTMENT':
        return 'Submit Adjustment';
      default:
        return 'Submit';
    }
  }

  void _submitExchange() {
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

    final currentProject = ref.read(currentProjectProvider);
    if (currentProject == null) return;

    final projectId = currentProject['id'] as String;
    final stockAsync = ref.read(materialStockProvider(projectId));

    stockAsync.whenData((stockList) {
      final selectedStock = stockList.firstWhere(
        (s) => s.materialName == (selectedMaterial ?? stockList[0].materialName),
      );

      if (exchangeType == 'USAGE' && quantity > selectedStock.availableQuantity) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Quantity exceeds available stock (${selectedStock.availableQuantity.toStringAsFixed(2)} ${selectedStock.unit})',
            ),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      // Show success and refresh
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${_getSubmitButtonText()} submitted successfully'),
          backgroundColor: Colors.green,
        ),
      );

      // Refresh stock
      ref.invalidate(materialStockProvider(projectId));

      // Clear form
      quantityController.clear();
      remarksController.clear();
    });
  }
}
