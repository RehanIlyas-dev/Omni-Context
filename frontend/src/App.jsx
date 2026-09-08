import { useChat } from './hooks/useChat';
import { useDocuments } from './hooks/useDocuments';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ContextPanel from './components/ContextPanel';

export default function App() {
  const {
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
  } = useChat();

  const {
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
  } = useDocuments();

  return (
    <div className="flex h-screen bg-[#0a0b0e] text-slate-200 font-sans antialiased selection:bg-blue-500/20 selection:text-blue-200">
      <Sidebar
        documents={documents}
        uploadStatuses={uploadStatuses}
        selectedDoc={selectedDoc}
        handleDocClick={handleDocClick}
        handleFiles={handleFiles}
        handleDrop={handleDrop}
        handleNewSession={handleNewSession}
      />

      <ChatArea
        messages={messages}
        inputQuery={inputQuery}
        setInputQuery={setInputQuery}
        isProcessing={isProcessing}
        showContext={showContext}
        setShowContext={setShowContext}
        chatEndRef={chatEndRef}
        handleSend={handleSend}
      />

      {showContext && (
        <ContextPanel
          selectedDoc={selectedDoc}
          setSelectedDoc={setSelectedDoc}
          docChunks={docChunks}
          setDocChunks={setDocChunks}
          loadingChunks={loadingChunks}
          activeSources={activeSources}
        />
      )}
    </div>
  );
}
