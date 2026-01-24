import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class SQLiteService {
  static Database? _db;

  static Future<Database> get database async {
    if (_db != null) return _db!;
    final path = await getDatabasesPath();
    final dbPath = join(path, 'bharatbuild_offline.db');
    _db = await openDatabase(
      dbPath,
      version: 3,
      onCreate: (db, v) async {
        await _createTables(db);
      },
      onUpgrade: (db, oldV, newV) async {
        if (oldV < 3) {
          await _createTables(db);
        }
      },
    );
    return _db!;
  }

  static Future<void> _createTables(Database db) async {
    // 1. Offline Actions (Operation-based Sync)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS offline_actions (
        id TEXT PRIMARY KEY,
        user_role TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_temp_id TEXT,
        payload TEXT NOT NULL,
        project_id TEXT,
        organization_id TEXT,
        created_at INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'PENDING',
        retry_count INTEGER DEFAULT 0,
        last_error TEXT
      )
    ''');

    // 2. Sync Metadata
    await db.execute('''
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    ''');

    // 3. Cached Projects (for Geofence validation)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_projects (
        project_id TEXT PRIMARY KEY,
        name TEXT,
        geofence TEXT,
        geofence_radius INTEGER,
        latitude REAL,
        longitude REAL,
        status TEXT,
        last_updated INTEGER
      )
    ''');

    // 4. Cached Attendance
    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_attendance (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        attendance_date TEXT,
        status TEXT,
        is_manual INTEGER,
        work_hours REAL,
        last_updated INTEGER
      )
    ''');

    // 5. Attendance Sessions (Offline sessions)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id TEXT PRIMARY KEY,
        attendance_id TEXT,
        check_in_time INTEGER,
        check_out_time INTEGER,
        worked_minutes INTEGER,
        sync_status TEXT DEFAULT 'PENDING'
      )
    ''');
    
    // Site Engineer Specific Caching
    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_organizations (
        org_id TEXT PRIMARY KEY,
        name TEXT,
        address TEXT,
        last_updated INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_material_requests (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT,
        category TEXT,
        quantity REAL,
        status TEXT,
        is_offline_created INTEGER,
        last_updated INTEGER
      )
    ''');
  }

  // Helper Methods for Actions
  static Future<void> insertAction(Map<String, dynamic> action) async {
    final db = await database;
    await db.insert('offline_actions', action, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  static Future<List<Map<String, dynamic>>> getPendingActions() async {
    final db = await database;
    return await db.query('offline_actions', where: 'sync_status = ?', whereArgs: ['PENDING'], orderBy: 'created_at ASC');
  }

  static Future<void> updateActionStatus(String id, String status, {String? error}) async {
    final db = await database;
    await db.update('offline_actions', {
      'sync_status': status,
      if (error != null) 'last_error': error,
    }, where: 'id = ?', whereArgs: [id]);
  }
}
