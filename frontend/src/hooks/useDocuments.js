import { useState, useEffect, useCallback } from 'react';
import { uploadDocuments, fetchDocuments, fetchDocumentChunks } from '../services/api';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [uploadStatuses, setUploadStatuses] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docChunks, setDocChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await fetchDocuments();
      setDocuments(data.documents || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchDocuments();
        if (!cancelled) setDocuments(data.documents || []);
      } catch {
        // silent
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleDocClick = useCallback(async (doc) => {
    if (selectedDoc?.filename === doc.filename) {
      setSelectedDoc(null);
      setDocChunks([]);
      return;
    }
    setSelectedDoc(doc);
    setLoadingChunks(true);
    try {
      const data = await fetchDocumentChunks(doc.filename);
      setDocChunks(data.chunks || []);
    } catch {
      setDocChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  }, [selectedDoc]);

  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;
    const fileList = Array.from(files);
    setUploadStatuses(fileList.map((f) => ({ file: f, status: 'uploading' })));

    try {
      const result = await uploadDocuments(files);
      const perFile = result.details || [];
      setUploadStatuses((prev) =>
        prev.map((entry, i) => {
          const r = perFile[i];
          return {
            ...entry,
            status: r?.status === 'success' ? 'done' : 'error',
          };
        })
      );
      // Reload documents after successful upload
      try {
        const data = await fetchDocuments();
        setDocuments(data.documents || []);
      } catch {
        // silent
      }
    } catch {
      setUploadStatuses((prev) => prev.map((e) => ({ ...e, status: 'error' })));
    }

    setTimeout(() => setUploadStatuses([]), 5000);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return {
    documents,
    uploadStatuses,
    selectedDoc,
    setSelectedDoc,
    docChunks,
    setDocChunks,
    loadingChunks,
    handleDocClick,
    handleFiles,
    handleDrop,
    loadDocuments,
  };
}
