import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../services/auth_service.dart';

class MaterialStockService {
  static final String baseUrl = API_BASE_URL;

  static Future<List<MaterialStock>> getProjectStock(String projectId) async {
    final auth = AuthService();
    final client = auth.client;

    final response = await client.get(
      Uri.parse('$baseUrl/engineer/material-stock/projects/$projectId/material-stock'),
      headers: {
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return (data['stock'] as List)
          .map((item) => MaterialStock.fromJson(item))
          .toList();
    } else {
      throw Exception('Failed to load material stock: ${response.body}');
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
