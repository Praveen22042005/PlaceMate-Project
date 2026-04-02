import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { generateJobDescription } from '../services/nvidia';

interface AIJobDescriptionProps {
  title: string;
  company: string;
  type: string;
  location: string;
  branches?: string;
  onGenerated: (description: string) => void;
}

export default function AIJobDescription({
  title,
  company,
  type,
  location,
  branches,
  onGenerated,
}: AIJobDescriptionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!title || !company) {
      setError('Please fill in Job Title and Company first.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const description = await generateJobDescription({
        title,
        company,
        type,
        location: location || 'Not specified',
        branches,
      });
      onGenerated(description);
    } catch (err: any) {
      console.error('JD Generation Error:', err);
      setError(err.message || 'Failed to generate description. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-700">Job Description</label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 disabled:opacity-50 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 border border-indigo-200 hover:from-indigo-100 hover:to-purple-100 hover:shadow-sm active:scale-95"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Generate with AI
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
