import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  component: React.ComponentType<any>;
}

interface NavigationProps {
  sections: Section[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

const Navigation: React.FC<NavigationProps> = ({ sections, currentPage, setCurrentPage }) => {
  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
        <span className="font-medium">{sections[currentPage].title}</span>
        <ChevronDown size={16} className="group-hover:rotate-180 transition-transform duration-200" />
      </button>
      
      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
        <div className="p-2">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setCurrentPage(index)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                index === currentPage
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{section.title}</span>
                {index === currentPage && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Navigation;