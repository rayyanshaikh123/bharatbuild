import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/dangerous_work_service.dart';
import '../../providers/attendance_provider.dart';
import '../../theme/app_colors.dart';

class DangerousWorkRequestScreen extends ConsumerStatefulWidget {
  const DangerousWorkRequestScreen({super.key});

  @override
  ConsumerState<DangerousWorkRequestScreen> createState() => _DangerousWorkRequestScreenState();
}

class _DangerousWorkRequestScreenState extends ConsumerState<DangerousWorkRequestScreen> {
  String? _selectedTaskId;
  bool _isLoading = false;
  List<dynamic> _tasks = [];
  List<dynamic> _myRequests = [];
  Map<String, dynamic>? _activeOtp;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final status = ref.read(liveStatusProvider).value;
      if (status == null || status['project_id'] == null) {
        throw Exception('No active project found');
      }

      final projectId = status['project_id'].toString();
      final service = ref.read(dangerousWorkServiceProvider);
      
      final tasks = await service.getAvailableTasks(projectId);
      final myRequests = await service.getMyRequests(projectId);

      if (mounted) {
        setState(() {
          _tasks = tasks;
          _myRequests = myRequests;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _handleCreateRequest() async {
    if (_selectedTaskId == null) return;
    
    setState(() => _isLoading = true);
    try {
      final status = ref.read(liveStatusProvider).value;
      final projectId = status!['project_id'].toString();
      final service = ref.read(dangerousWorkServiceProvider);

      await service.createRequest(_selectedTaskId!, projectId);
      await _loadData();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Request created successfully')));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _handleGenerateOtp(String requestId) async {
    setState(() => _isLoading = true);
    try {
      final service = ref.read(dangerousWorkServiceProvider);
      final result = await service.generateOtp(requestId);
      
      if (mounted) {
        setState(() {
          _activeOtp = result;
          _isLoading = false;
        });
        _showOtpDialog(requestId, result['otp']);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  void _showOtpDialog(String requestId, String otp) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Safety OTP'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Show this OTP to the Site Engineer for authorization:'),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.orange, width: 2),
              ),
              child: Text(
                otp,
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 8, color: Colors.orange),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Expires in 5 minutes', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _showVerifyDialog(requestId);
            },
            child: const Text('Verify Authorization'),
          ),
        ],
      ),
    );
  }

  void _showVerifyDialog(String requestId) {
    final TextEditingController otpController = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Verify Authorization'),
        content: TextField(
          controller: otpController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Enter OTP provided by Engineer',
            hintText: '6-digit code',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final otp = otpController.text;
              if (otp.length != 6) return;
              
              Navigator.pop(context);
              setState(() => _isLoading = true);
              try {
                final service = ref.read(dangerousWorkServiceProvider);
                await service.verifyOtp(requestId, otp);
                await _loadData();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Authorized successfully!'), backgroundColor: Colors.green));
                }
              } catch (e) {
                if (mounted) {
                  setState(() => _isLoading = false);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Verification failed: $e')));
                }
              }
            },
            child: const Text('Verify'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Safety Authorization'),
        actions: [
          IconButton(onPressed: _loadData, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildTaskSelection(theme),
                const SizedBox(height: 32),
                _buildMyRequestsList(theme),
              ],
            ),
          ),
    );
  }

  Widget _buildTaskSelection(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.orange),
            const SizedBox(width: 12),
            Text('Request Authorization', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 16),
        if (_tasks.isEmpty)
          const Text('No active dangerous tasks defined for this project.')
        else ...[
          DropdownButtonFormField<String>(
            value: _selectedTaskId,
            hint: const Text('Select Task'),
            items: _tasks.map<DropdownMenuItem<String>>((t) => DropdownMenuItem(
              value: t['id'].toString(),
              child: Text(t['name']),
            )).toList(),
            onChanged: (val) => setState(() => _selectedTaskId = val),
            decoration: InputDecoration(
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              filled: true,
              fillColor: Colors.grey[50],
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _selectedTaskId == null ? null : _handleCreateRequest,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 50),
              backgroundColor: Colors.orange,
              foregroundColor: Colors.white,
            ),
            child: const Text('Create Safety Request'),
          ),
        ],
      ],
    );
  }

  Widget _buildMyRequestsList(ThemeData theme) {
    if (_myRequests.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('My Recent Requests', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _myRequests.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final req = _myRequests[index];
            final status = req['status'] as String;
            final isRequested = status == 'REQUESTED';
            final isApproved = status == 'APPROVED';
            
            return Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text(req['task_name'], style: const TextStyle(fontWeight: FontWeight.bold))),
                        _buildStatusBadge(status),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Requested at: ${DateFormat('MMM d, HH:mm').format(DateTime.parse(req['requested_at']))}',
                      style: TextStyle(color: Colors.grey[600], fontSize: 12),
                    ),
                    if (isRequested) ...[
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () => _handleGenerateOtp(req['id'].toString()),
                              style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, foregroundColor: Colors.white),
                              child: const Text('Show OTP'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _showVerifyDialog(req['id'].toString()),
                              child: const Text('Verify'),
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (isApproved) ...[
                       const SizedBox(height: 12),
                       Row(
                         children: [
                           const Icon(Icons.verified, color: Colors.green, size: 16),
                           const SizedBox(width: 8),
                           Text(
                             'Approved by ${req['approved_by_name'] ?? 'Engineer'}',
                             style: const TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold),
                           ),
                         ],
                       ),
                    ],
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color = Colors.grey;
    if (status == 'APPROVED') color = Colors.green;
    if (status == 'REQUESTED') color = Colors.blue;
    if (status == 'REJECTED') color = Colors.red;
    if (status == 'EXPIRED') color = Colors.orange;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
      child: Text(status, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }
}
