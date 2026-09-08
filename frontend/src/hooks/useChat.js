import { useState, useRef, useEffect, useCallback } from 'react';
import { streamChatQuery, clearSession } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSources, setActiveSources] = useState([]);
  const [showContext, setShowContext] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!inputQuery.trim() || isProcessing) return;

    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    const userMessage = { id: userMsgId, sender: 'user', text: inputQuery };
    const initialAssistantMessage = {
      id: assistantMsgId, sender: 'assistant', text: '', isStreaming: true, sources: [], cached: false,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInputQuery('');
    setIsProcessing(true);
    setActiveSources([]);

    try {
      await streamChatQuery(
        inputQuery,
        (token) => {
          setMessages((prev) =>
            prev.map((msg) => msg.id === assistantMsgId ? { ...msg, text: msg.text + token } : msg)
          );
        },
        (sources, cached) => {
          setMessages((prev) =>
            prev.map((msg) => msg.id === assistantMsgId
              ? { ...msg, sources, cached, isStreaming: false }
              : msg
            )
          );
          setActiveSources(sources || []);
        }
      );
    } catch {
      setMessages((prev) =>
        prev.map((msg) => msg.id === assistantMsgId
          ? { ...msg, text: 'Failed to connect to the backend. Please try again.', isStreaming: false }
          : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  }, [inputQuery, isProcessing]);

  const handleNewSession = useCallback(() => {
    clearSession();
    setMessages([]);
    setActiveSources([]);
    setInputQuery('');
    setShowContext(true);
  }, []);

  return {
    messages,
    inputQuery,
    setInputQuery,
    isProcessing,
    activeSources,
    showContext,
    setShowContext,
    chatEndRef,
    handleSend,
    handleNewSession,
  };
}
