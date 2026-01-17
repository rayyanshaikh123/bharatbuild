import 'package:flutter/material.dart';
import '../widgets/app_ui.dart';

/// AppLayout provides a two-column layout (sidebar + content) inspired by
/// the web frontend. Intended to be swapped to `gluestack_ui_flutter`
/// primitives later — currently uses Material widgets for safety.
class AppLayout extends StatelessWidget {
  final String title;
  final Widget child;

  const AppLayout({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppHeader(title: title),
      body: Row(
        children: [
          // Sidebar
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 260, minWidth: 200),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    const Color(0xFF07102A).withOpacity(0.98),
                    const Color(0xFF03121E).withOpacity(0.95),
                  ],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'BharatBuild',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 18),
                  _NavItem(icon: Icons.dashboard, label: 'Dashboard'),
                  const SizedBox(height: 8),
                  _NavItem(icon: Icons.engineering, label: 'Engineer Flow'),
                  const SizedBox(height: 8),
                  _NavItem(icon: Icons.group, label: 'Labour Flow'),
                ],
              ),
            ),
          ),

          // Main content
          Expanded(
            child: Container(
              color: Theme.of(context).colorScheme.background,
              child: Padding(padding: const EdgeInsets.all(20.0), child: child),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  const _NavItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {},
      child: Row(
        children: [
          Icon(icon, color: Colors.white),
          const SizedBox(width: 12),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
