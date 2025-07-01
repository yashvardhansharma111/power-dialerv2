import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Play, Pause, Square, RotateCcw, Phone, CheckCircle, XCircle, Clock, FileSpreadsheet, AlertCircle, X } from 'lucide-react';
import { API } from '@/utils/const';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Device } from '@twilio/voice-sdk';
import { toast } from '@/hooks/use-toast';

interface CallResult {
  number: string;
  status: 'pending' | 'initiated' | 'ringing' | 'in-progress' | 'success' | 'failed';
  sid?: string;
  error?: string;
}

interface BulkCallStatus {
  total: number;
  currentIndex: number;
  isPaused: boolean;
  isStopped: boolean;
  results: CallResult[];
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const BulkCallTab = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [callStatus, setCallStatus] = useState<BulkCallStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string>('');
  const [twilioDevice, setTwilioDevice] = useState<Device | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [activeCallSid, setActiveCallSid] = useState<string>('');
  const [currentBulkIndex, setCurrentBulkIndex] = useState<number>(0);
  const [bulkNumbers, setBulkNumbers] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isBulkActive = !!callStatus && !callStatus.isStopped && !callStatus.isPaused && callStatus.currentIndex < callStatus.total;

  // Toast management
  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const isAllCallsCompleted = () => {
    return callStatus && callStatus.currentIndex === callStatus.total && 
           callStatus.total > 0 && !callStatus.isPaused && !callStatus.isStopped;
  };

  const validateFile = (file: File): boolean => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const allowedMimeTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const isValidExtension = allowedExtensions.includes(fileExtension);
    const isValidMimeType = allowedMimeTypes.includes(file.type) || file.type === '';

    if (!isValidExtension || !isValidMimeType) {
      addToast('error', 'Please upload only Excel (.xlsx, .xls) or CSV files');
      return false;
    }

    return true;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Fetch status from API with abort controller
  const fetchStatus = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    try {
      const response = await fetch(API.BULK_CALLS.STATUS, {
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
        signal: abortControllerRef.current.signal
      });
      if (response.ok) {
        const status = await response.json();
        setCallStatus(status);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({ title: 'Failed to fetch status', description: error.message, variant: 'destructive' });
      }
    }
  }, []);

  // Start polling status when calls are active
  useEffect(() => {
    const shouldPoll = callStatus && callStatus.total > 0 && !callStatus.isStopped && 
                      callStatus.currentIndex < callStatus.total;
    if (shouldPoll && !isPolling) {
      setIsPolling(true);
      statusIntervalRef.current = setInterval(fetchStatus, 1000);
    } else if (!shouldPoll && isPolling) {
      setIsPolling(false);
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    }
    return () => {
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
        statusIntervalRef.current = null;
      }
    };
  }, [callStatus, isPolling, fetchStatus]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
        setUploadSuccess(null);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setUploadedFile(file);
        setUploadSuccess(null);
      }
    }
  };

  const uploadFile = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const response = await fetch(API.BULK_CALLS.UPLOAD_EXCEL, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadSuccess(`✅ Successfully uploaded ${result.total} numbers from ${uploadedFile.name}`);
        addToast('success', `Successfully uploaded ${result.total} numbers`);
        await fetchStatus();
        await startCalls(); // Start calling after upload
      } else {
        const error = await response.json();
        addToast('error', `Upload failed: ${error.message}`);
      }
    } catch (error) {
      addToast('error', 'Upload failed: Network error');
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch available Twilio numbers on mount
  useEffect(() => {
    const fetchAvailableNumbers = async () => {
      try {
        const response = await fetch(API.GET_NUMBERS, {
          headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
        });
        const data = await response.json();
        const numbers = Array.isArray(data) ? data : data.numbers || [];
        setAvailableNumbers(numbers);
        if (numbers.length > 0) setSelectedNumber(numbers[0].phoneNumber);
      } catch {
        toast({ title: 'Failed to fetch Twilio numbers', description: 'Unable to load Twilio numbers.', variant: 'destructive' });
      }
    };
    fetchAvailableNumbers();
  }, []);

  // Setup Twilio Device (same as DialerPad)
  const setupTwilio = useCallback(async () => {
    try {
      const res = await fetch(API.GET_TWILIO_TOKEN, {
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      });
      const { token } = await res.json();
      const device = new Device(token);
      device.on('registered', () => {
        setTwilioDevice(device);
        toast({ title: 'Twilio Device registered' });
      });
      device.on('error', (err: any) => {
        toast({ title: 'Twilio Device Error', description: err.message, variant: 'destructive' });
      });
      device.register();
    } catch (err: any) {
      toast({ title: 'Twilio Device Setup Failed', description: err.message, variant: 'destructive' });
    }
  }, []);

  // Initiate the bulk call loop (frontend-driven)
  const startCalls = async () => {
    setIsStarting(true);
    try {
      const response = await fetch(API.BULK_CALLS.START, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('jwt')}`,
        },
        body: JSON.stringify({ from: selectedNumber }),
      });
      if (response.ok) {
        addToast('success', 'Bulk calling started successfully');
        // Immediately fetch status to get the numbers
        const statusRes = await fetch(API.BULK_CALLS.STATUS, {
          headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
        });
        const status = await statusRes.json();
        setBulkNumbers(status.results.map((r: any) => r.number));
        setCurrentBulkIndex(0);
        // Start the first call
        initiateNextCall(status.results.map((r: any) => r.number), 0);
      } else {
        const error = await response.json();
        addToast('error', `Failed to start: ${error.message}`);
      }
    } catch (error: any) {
      addToast('error', 'Failed to start calls: Network error');
    } finally {
      setIsStarting(false);
    }
  };

  // Initiate the next call in the bulk list
  const initiateNextCall = async (numbers: string[], index: number) => {
    if (!twilioDevice || !numbers[index]) return;
    setIsCalling(true);
    try {
      const conn = await twilioDevice.connect({ params: { To: numbers[index], From: selectedNumber } });
      setActiveCallSid(conn?.parameters?.CallSid || '');
      toast({ title: 'Call Initiated', description: `Dialing ${numbers[index]}...` });
      // Listen for disconnect to trigger next call
      conn.on('disconnect', () => {
        setIsCalling(false);
        setCurrentBulkIndex(prev => prev + 1);
        if (index + 1 < numbers.length) {
          initiateNextCall(numbers, index + 1);
        } else {
          toast({ title: 'Bulk Call Complete', description: 'All calls completed.' });
          setBulkNumbers([]);
          setCurrentBulkIndex(0);
        }
      });
    } catch (err: any) {
      toast({ title: 'Call Failed', description: `Failed to call ${numbers[index]}`, variant: 'destructive' });
      setIsCalling(false);
      setCurrentBulkIndex(prev => prev + 1);
      if (index + 1 < numbers.length) {
        initiateNextCall(numbers, index + 1);
      }
    }
  };

  const pauseCalls = async () => {
    try {
      const response = await fetch(API.BULK_CALLS.PAUSE, { method: 'POST' });
      if (response.ok) {
        addToast('info', 'Bulk calling paused');
        await fetchStatus();
      } else {
        addToast('error', 'Failed to pause calls');
      }
    } catch (error) {
      addToast('error', 'Failed to pause calls: Network error');
    }
  };

  // Resume bulk call (frontend-driven)
  const resumeCalls = async () => {
    try {
      const response = await fetch(API.BULK_CALLS.RESUME, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      });
      if (response.ok) {
        addToast('success', 'Bulk calling resumed');
        await fetchStatus();
        // Resume the call loop if there are numbers left
        if (bulkNumbers.length > 0 && currentBulkIndex < bulkNumbers.length) {
          initiateNextCall(bulkNumbers, currentBulkIndex);
        }
      } else {
        addToast('error', 'Failed to resume calls');
      }
    } catch (error: any) {
      addToast('error', 'Failed to resume calls: Network error');
    }
  };

  // Setup Twilio Device on mount
  useEffect(() => {
    setupTwilio();
  }, [setupTwilio]);

  // Fetch available numbers on mount
  // Fetch available numbers on mount
  const fetchAvailableNumbers = async () => {
    try {
      const response = await fetch(API.GET_NUMBERS, {
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      });
      const data = await response.json();
      const numbers = Array.isArray(data) ? data : data.numbers || [];
      setAvailableNumbers(numbers);
      if (numbers.length > 0) setSelectedNumber(numbers[0].phoneNumber);
    } catch {
      toast({ title: 'Failed to fetch Twilio numbers', description: 'Unable to load Twilio numbers.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchAvailableNumbers();
  }, []);


  const stopCalls = async () => {
    try {
      const response = await fetch(API.BULK_CALLS.STOP, { method: 'POST' });
      if (response.ok) {
        addToast('info', 'Bulk calling stopped');
        setIsPolling(false);
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
          statusIntervalRef.current = null;
        }
        await fetchStatus();
      } else {
        addToast('error', 'Failed to stop calls');
      }
    } catch (error) {
      addToast('error', 'Failed to stop calls: Network error');
    }
  };

  const getStatusColor = () => {
    if (!callStatus || callStatus.total === 0) return 'bg-gray-700 text-gray-200';
    if (callStatus.isStopped) return 'bg-red-900/30 text-red-300';
    if (callStatus.isPaused) return 'bg-yellow-900/30 text-yellow-300';
    return 'bg-green-900/30 text-green-300';
  };

  const getStatusText = () => {
    if (!callStatus || callStatus.total === 0) return 'Idle';
    if (callStatus.isStopped) return 'Stopped';
    if (callStatus.isPaused) return 'Paused';
    return 'Active';
  };

  const getProgressPercentage = () => {
    if (!callStatus || callStatus.total === 0) return 0;
    return (callStatus.currentIndex / callStatus.total) * 100;
  };

  const getCompletedCount = () => {
    if (!callStatus) return 0;
    return callStatus.results.filter(r => r.status === 'success' || r.status === 'failed').length;
  };

  const getSuccessCount = () => {
    if (!callStatus) return 0;
    return callStatus.results.filter(r => r.status === 'success').length;
  };

  const getFailedCount = () => {
    if (!callStatus) return 0;
    return callStatus.results.filter(r => r.status === 'failed').length;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Find the current in-progress call
  const currentInProgress = callStatus?.results.find(r => r.status === 'in-progress');

  // Debug log results on every status update
  useEffect(() => {
    console.log('[BulkCallTab] callStatus.results:', callStatus?.results);
  }, [callStatus]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 bg-gray-900 min-h-screen">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-lg shadow-lg animate-in slide-in-from-right duration-300 ${
              toast.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : toast.type === 'error'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {/* Upload Section */}
      <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-blue-600" />
          Upload Excel File
        </h2>
        {/* Twilio Number Selector */}
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-100 dark:text-gray-200">Select Twilio Caller ID</label>
          {availableNumbers.length > 0 ? (
            <Select value={selectedNumber} onValueChange={setSelectedNumber}>
              <SelectTrigger className="bg-gray-800 dark:bg-gray-800 text-white dark:text-gray-100 border border-gray-600 dark:border-gray-700 focus:ring-2 focus:ring-blue-500">
                <SelectValue placeholder="Select caller ID" className="text-white dark:text-gray-100" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 dark:bg-gray-800 text-white dark:text-gray-100 border border-gray-600 dark:border-gray-700">
                {availableNumbers.map((num: any) => (
                  <SelectItem key={num.phoneNumber} value={num.phoneNumber} className="bg-gray-800 dark:bg-gray-800 text-white dark:text-gray-100 hover:bg-blue-100 dark:hover:bg-blue-900">
                    {num.friendlyName || num.phoneNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">No Twilio numbers available.</p>
          )}
        </div>
        
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
            dragActive 
              ? 'border-blue-400 bg-blue-900/20 scale-105' 
              : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload file area - click to browse or drag and drop files"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="File input"
          />
          
          <Upload className={`w-12 h-12 mx-auto mb-4 transition-colors ${
            dragActive ? 'text-blue-500' : 'text-gray-400'
          }`} />
          
          {uploadedFile ? (
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-100">{uploadedFile.name}</p>
              <p className="text-sm text-gray-300">{formatFileSize(uploadedFile.size)}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  uploadFile();
                }}
                disabled={isUploading}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
              >
                {isUploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-lg text-gray-200 mb-2">Drop your Excel or CSV file here or click to browse</p>
              <p className="text-sm text-gray-400">Supports .xlsx, .xls, and .csv files</p>
            </div>
          )}
        </div>

        {/* Upload Success Message */}
        {uploadSuccess && (
          <div className="mt-4 p-3 bg-green-900/20 border border-green-600 rounded-lg text-green-300 text-sm animate-in slide-in-from-top duration-300">
            {uploadSuccess}
          </div>
        )}
      </div>

      {/* Progress Panel */}
      {callStatus && callStatus.total > 0 && (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 animate-in slide-in-from-bottom duration-500">
          {/* Show current in-progress call at the top */}
          {currentInProgress && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-600 rounded-lg flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="font-semibold">Currently calling:</span>
              <span className="font-mono text-lg">{currentInProgress.number}</span>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              Call Progress
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Progress</span>
              <span>{callStatus.currentIndex} / {callStatus.total}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            {isAllCallsCompleted() && (
              <div className="mt-2 text-green-600 font-medium flex items-center justify-center gap-2 animate-in fade-in duration-500">
                <CheckCircle className="w-5 h-5" />
                All calls completed successfully!
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white transition-all duration-300">
                {callStatus.total}
              </div>
              <div className="text-sm text-gray-200">Total</div>
            </div>
            <div className="bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 transition-all duration-300">
                {getCompletedCount()}
              </div>
              <div className="text-sm text-gray-200">Completed</div>
            </div>
            <div className="bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 transition-all duration-300">
                {getSuccessCount()}
              </div>
              <div className="text-sm text-gray-200">Success</div>
            </div>
            <div className="bg-red-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600 transition-all duration-300">
                {getFailedCount()}
              </div>
              <div className="text-sm text-gray-200">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Panel */}
      {callStatus && callStatus.total > 0 && (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 animate-in slide-in-from-bottom duration-700">
          <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
          <div className="flex flex-wrap gap-3">
            {callStatus.currentIndex === 0 && !callStatus.isPaused && callStatus.isStopped && (
              <button
                onClick={startCalls}
                disabled={isStarting}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                aria-label="Start bulk calling process"
              >
                <Play className="w-4 h-4" />
                {isStarting ? 'Starting...' : 'Start Calls'}
              </button>
            )}
            
            {!callStatus.isStopped && !callStatus.isPaused && (
              <button
                onClick={pauseCalls}
                className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                aria-label="Pause bulk calling process"
              >
                <Pause className="w-4 h-4" />
                Pause
              </button>
            )}
            
            {callStatus.isPaused && (
              <button
                onClick={resumeCalls}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                aria-label="Resume bulk calling process"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}
            
            {!callStatus.isStopped && (
              <button
                onClick={stopCalls}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                aria-label="Stop bulk calling process"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent Calls Log */}
      {callStatus && callStatus.results.length > 0 && (
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 animate-in slide-in-from-bottom duration-1000">
          <h3 className="text-xl font-bold text-white mb-4">Recent Calls</h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {callStatus.results
              .filter(result => result.status !== 'pending' && result.status !== 'in-progress')
              .slice(-20)
              .reverse()
              .map((result, index) => (
                <div
                  key={`${result.number}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600 animate-in slide-in-from-left duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div>
                    <div className="font-mono text-lg">{result.number}</div>
                    <div className="text-xs text-gray-300">SID: {result.sid || '-'}</div>
                    
                    {result.error && (
                      <div className="text-xs text-red-600">Error: {result.error}</div>
                    )}
                  </div>
                  <span className={`ml-4 px-2 py-1 rounded text-xs ${
                    result.status === 'success' ? 'bg-green-900/30 text-green-300' :
                    result.status === 'failed' ? 'bg-red-900/30 text-red-300' :
                    'bg-gray-700 text-gray-200'
                  }`}>
                   {result.status}
                  </span>
                </div>
              ))}
            {callStatus.results.filter(r => r.status !== 'pending' && r.status !== 'in-progress').length === 0 && (
              <div className="text-center text-gray-300 py-8">
                No calls made yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkCallTab;