import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class OfflineQueueService {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    final path = await getDatabasesPath();
    final dbPath = join(path, 'labour_app.db');
    _db = await openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, v) async {
        await db.execute('''
        CREATE TABLE offline_attendance_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          accuracy REAL,
          device_id TEXT,
          payload TEXT,
          synced INTEGER DEFAULT 0
        )
      ''');
      },
    );
    return _db!;
  }

  static Future<int> push(Map<String, dynamic> row) async {
    final db = await database;
    return await db.insert('offline_attendance_queue', row);
  }

  static Future<List<Map<String, Object?>>> pending() async {
    final db = await database;
    return await db.query('offline_attendance_queue', where: 'synced = 0');
  }

  static Future<void> markSynced(int id) async {
    final db = await database;
    await db.update(
      'offline_attendance_queue',
      {'synced': 1},
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
