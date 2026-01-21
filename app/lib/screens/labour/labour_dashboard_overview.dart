import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import 'labour_dashboard_detail.dart';

/// Content-only overview used inside the mobile `IndexedStack`.
class LabourDashboardOverviewContent extends StatelessWidget {
  const LabourDashboardOverviewContent({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          const Text(
            'Rajesh Kumar',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Select your deployment zone for today',
            style: TextStyle(color: Colors.black54),
          ),
          const SizedBox(height: 20),

          const Text(
            'AVAILABLE SITES',
            style: TextStyle(
              color: Colors.black54,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),

          Expanded(
            child: ListView(
              children: const [
                _SiteCard(title: 'ZONE 4, MUMBAI'),
                SizedBox(height: 12),
                _SiteCard(title: 'COASTAL ROAD'),
                SizedBox(height: 12),
                _SiteCard(title: 'HITECH CITY'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Full-screen wrapper (keeps the original AppBar) for direct route usage.
class LabourDashboardOverview extends StatelessWidget {
  const LabourDashboardOverview({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: const Text(
          'Authenticated Node',
          style: TextStyle(
            color: Colors.black87,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline, color: Colors.black54),
            onPressed: () {},
          ),
        ],
      ),
      body: const LabourDashboardOverviewContent(),
    );
  }
}

class _SiteCard extends StatelessWidget {
  final String title;
  const _SiteCard({required this.title});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const LabourDashboardDetail()),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 22),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black12,
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                letterSpacing: 0.4,
              ),
            ),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.black12),
              ),
              child: const Icon(Icons.add, color: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }
}
