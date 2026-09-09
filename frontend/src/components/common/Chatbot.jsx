import { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { chatbotService } from '../../services/api';

// Questions suggérées, affichées tant que la conversation n'a pas commencé
const SUGGESTIONS = [
  'Combien de producteurs ?',
  "Combien d'inactifs ?",
  'Combien de femmes productrices ?',
  'Liste des villages',
  'Statistiques',
  'Que sais-tu faire ?',
];

const WELCOME_MESSAGE = {
  text: "Bonjour ! Je suis Assistant Vanille. Je réponds aux questions sur les producteurs, les villages et les statistiques. Choisissez une suggestion ou posez votre question.",
  sender: 'bot',
};

function Chatbot() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Fait défiler vers le dernier message à chaque mise à jour
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const trimmed = (text ?? '').trim();
    if (!trimmed || loading) return;

    const userMessage = { text: trimmed, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatbotService.sendMessage(trimmed);
      const botMessage = {
        text: response.data.response,
        sender: 'bot',
        intent: response.data.intent,
        aiMode: response.data.ai_mode || false,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch {
      const errorMessage = {
        text: "Désolé, une erreur s'est produite.",
        sender: 'bot',
        aiMode: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearConversation = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  // Le badge IA ne s'affiche que si l'IA est réellement utilisée
  const aiActive = messages.some((msg) => msg.aiMode);

  return (
    <div className="absolute bottom-20 right-0 w-96 bg-white rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-dark text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-primary-yellow rounded-full mr-2 animate-pulse"></div>
          <h3 className="font-bold">Assistant Vanille</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs px-2 py-1 rounded-full ${aiActive ? 'bg-green-600' : 'bg-gray-500'}`}
          >
            {aiActive ? 'IA' : 'Local'}
          </span>
          <button
            type="button"
            onClick={clearConversation}
            title="Vider la conversation"
            className="text-gray-300 hover:text-white"
          >
            <Icon name="TrashIcon" size="sm" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg ${
                msg.sender === 'user'
                  ? 'bg-primary-yellow text-dark'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{msg.text}</p>
              {msg.intent && (
                <span className="text-xs text-gray-500 mt-1 block">
                  [{msg.intent}]
                </span>
              )}
              {msg.aiMode && (
                <span className="text-xs text-blue-500 mt-1 block flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                  Réponse IA
                </span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 p-3 rounded-lg">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 pt-3 border-t bg-gray-50">
          <div className="flex flex-wrap gap-2 pb-3">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => sendMessage(suggestion)}
                className="text-xs px-3 py-1 border border-gray-300 rounded-full text-gray-600 hover:bg-primary-yellow hover:border-primary-yellow hover:text-dark transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez-moi une question sur les producteurs, villages, statistiques..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary-yellow"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-yellow text-dark px-4 py-2 rounded font-semibold hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center"
          >
            <Icon name="PaperAirplaneIcon" size="md" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default Chatbot;
