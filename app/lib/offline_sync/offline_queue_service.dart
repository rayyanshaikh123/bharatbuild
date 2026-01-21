import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class OfflineQueueService {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    final path = await getDatabasesPath();
    final dbPath = join(path, 'bharatbuild_offline.db');
    _db = await openDatabase(
      dbPath,
      version: 2,
      onCreate: (db, v) async {
        await _createTables(db);
      },
      onUpgrade: (db, oldV, newV) async {
        if (oldV < 2) {
          await _createTables(db);
        }
      },
    );
    return _db!;
  }

  static Future<void> _createTables(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS offline_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        payload TEXT,
        timestamp TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      )
    ''');
  }

  static Future<int> push({
    required String type,
    required String endpoint,
    String method = 'POST',
    Map<String, dynamic>? payload,
  }) async {
    final db = await database;
    return await db.insert('offline_queue', {
      'type': type,
      'endpoint': endpoint,
      'method': method,
      'payload': payload != null ? jsonEncode(payload) : null,
      'timestamp': DateTime.now().toIso8601String(),
      'synced': 0,
    });
  }

  static Future<List<Map<String, dynamic>>> pending() async {
    final db = await database;
    return await db.query('offline_queue', where: 'synced = 0');
  }

  static Future<void> markSynced(int id) async {
    final db = await database;
    await db.update(
      'offline_queue',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
