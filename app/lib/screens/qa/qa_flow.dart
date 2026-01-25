import 'package:flutter/material.dart';
import 'qa_home_screen.dart';
import 'qa_profile_screen.dart';

class QAFlowScreen extends StatefulWidget {
  const QAFlowScreen({super.key});

  @override
  State<QAFlowScreen> createState() => _QAFlowScreenState();
}

class _QAFlowScreenState extends State<QAFlowScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const QAHomeScreen(),
    const QAProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("QA Engineer"),
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Projects',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
