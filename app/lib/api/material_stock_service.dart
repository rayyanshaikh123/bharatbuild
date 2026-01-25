import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class MaterialStockService {
  static const String baseUrl = AuthService.baseUrl;

  static Future<List<MaterialStock>> getProjectStock(String projectId) async {
    final token = await AuthService.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final response = await http.get(
      Uri.parse(
          '$baseUrl/engineer/material-stock/projects/$projectId/material-stock'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return (data['stock'] as List)
          .map((item) => MaterialStock.fromJson(item))
          .toList();
    } else {
      throw Exception('Failed to load material stock');
    }
  }
}

class MaterialStock {
  final String materialName;
  final double availableQuantity;
  final String unit;
  final double totalReceived;
  final double totalConsumed;
  final String? category;

  MaterialStock({
    required this.materialName,
    required this.availableQuantity,
    required this.unit,
    required this.totalReceived,
    required this.totalConsumed,
    this.category,
  });

  factory MaterialStock.fromJson(Map<String, dynamic> json) {
    return MaterialStock(
      materialName: json['material_name'],
      availableQuantity: (json['available_quantity'] as num).toDouble(),
      unit: json['unit'],
      totalReceived: (json['total_received'] as num).toDouble(),
      totalConsumed: (json['total_consumed'] as num).toDouble(),
      category: json['category'],
    );
  }
}
