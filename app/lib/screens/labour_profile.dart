import 'package:flutter/material.dart';
import 'signin_template.dart';

class LabourProfileScreen extends StatelessWidget {
  const LabourProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SignInTemplate(
      title: 'Profile',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 8),
          Center(
            child: CircleAvatar(
              radius: 42,
              backgroundColor: const Color(0xFFF5FCF9),
              child: const Text(
                'RK',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Name', style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFF5FCF9),
              borderRadius: BorderRadius.circular(50),
            ),
            child: Text(
              'Ramesh Kumar',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
          const SizedBox(height: 12),
          Text('Phone', style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFFF5FCF9),
              borderRadius: BorderRadius.circular(50),
            ),
            child: Text(
              '+91 98765 43210',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00BF6D),
              shape: const StadiumBorder(),
              minimumSize: const Size(double.infinity, 48),
            ),
            child: const Text('Edit Profile'),
          ),
        ],
      ),
    );
  }
}
