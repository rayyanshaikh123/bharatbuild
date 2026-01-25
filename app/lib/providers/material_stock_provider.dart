import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/material_stock_service.dart';

final materialStockProvider = FutureProvider.family<List<MaterialStock>, String>(
  (ref, projectId) async {
    return MaterialStockService.getProjectStock(projectId);
  },
);
