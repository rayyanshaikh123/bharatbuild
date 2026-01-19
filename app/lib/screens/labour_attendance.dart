import 'package:flutter/material.dart';
import 'signin_template.dart';

class LabourAttendanceScreen extends StatelessWidget {
  const LabourAttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final records = [
      {'date': '2026-01-16', 'status': 'Present'},
      {'date': '2026-01-15', 'status': 'Absent'},
      {'date': '2026-01-14', 'status': 'Present'},
    ];
    return SignInTemplate(
      title: 'Attendance',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          ...records.map(
            (r) => ListTile(
              tileColor: const Color(0xFFF5FCF9),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
              title: Text(
                r['date']!,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              trailing: Text(
                r['status']!,
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
