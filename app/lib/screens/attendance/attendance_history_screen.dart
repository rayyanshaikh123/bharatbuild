import 'package:flutter/material.dart';
import '../../theme/app_text_theme.dart';
import '../../theme/app_colors.dart';

class AttendanceHistoryScreen extends StatelessWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final rows = List.generate(
      12,
      (i) => {
        'date': '2026-01-${(i % 30) + 1}',
        'in': '09:0${i % 6} AM',
        'out': '05:0${i % 6} PM',
        'hours': '8.0',
      },
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Attendance History',
          style: Theme.of(context).textTheme.headingMedium,
        ),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemBuilder: (_, idx) {
          final r = rows[idx];
          return Card(
            child: ListTile(
              title: Text(
                r['date']!,
                style: Theme.of(context).textTheme.headingMedium,
              ),
              subtitle: Text(
                'In: ${r['in']}  Out: ${r['out']}',
                style: Theme.of(context).textTheme.mutedStyle,
              ),
              trailing: Text(
                '${r['hours']} h',
                style: Theme.of(context).textTheme.bodyStyle,
              ),
            ),
          );
        },
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemCount: rows.length,
      ),
    );
  }
}
