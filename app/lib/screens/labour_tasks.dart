import 'package:flutter/material.dart';
import 'signin_template.dart';

class LabourTasksScreen extends StatelessWidget {
  const LabourTasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tasks = ['Unload materials', 'Mix concrete', 'Clear debris'];
    return SignInTemplate(
      title: 'Tasks',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          ...tasks.map(
            (t) => Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.03),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_box_outline_blank,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        t,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00BF6D),
                        shape: const StadiumBorder(),
                      ),
                      child: const Text('Start'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
