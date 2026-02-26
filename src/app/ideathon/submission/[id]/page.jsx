"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";

export default function SubmissionPage() {
  const params = useParams();
  const id = params?.id;
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubmission() {
      setLoading(true);
      const res = await fetch(`/api/ideathon/submissions/${id}`);
      const data = await res.json();
      setSubmission(data.submission || null);
      setLoading(false);
    }
    if (id) fetchSubmission();
  }, [id]);

  function handleDownload() {
    if (!submission) return;
    if (submission.fileUrl) {
      window.open(submission.fileUrl, "_blank");
      return;
    }
    const content = [
      `Title: ${submission.title}`,
      `Description: ${submission.description || ''}`,
      `Links: ${(submission.links || []).join(', ')}`,
      `Team: ${submission.team?.teamName || 'Individual'}`,
      `Leader: ${submission.leader.name} (${submission.leader.email}, ${submission.leader.phoneNo})`,
      `Members: ${(submission.members || []).map(m => `${m.name} (${m.email})`).join('; ')}`,
      `College: ${submission.leader.college}`
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submission_${submission._id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!submission) return <div className="p-8 text-center text-muted-foreground">Submission not found.</div>;

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-2">Submission Details</h1>
      <div className="space-y-2">
        <div><strong>Title:</strong> {submission.title}</div>
        <div><strong>Description:</strong> {submission.description || 'No description provided.'}</div>
        <div><strong>Links:</strong> {(submission.links || []).map(l => <a key={l} href={l} target="_blank" rel="noopener" className="text-blue-600 underline mr-2">{l}</a>) || 'No links.'}</div>
        <div><strong>Team:</strong> {submission.team?.teamName || 'Individual'}</div>
        <div><strong>Leader:</strong> {submission.leader.name} ({submission.leader.email}, {submission.leader.phoneNo})</div>
        <div><strong>Members:</strong> {(submission.members || []).map(m => `${m.name} (${m.email})`).join(', ')}</div>
        <div><strong>College:</strong> {submission.leader.college}</div>
      </div>
      <Button onClick={handleDownload} variant="outline">Download Submission</Button>
    </div>
  );
}
