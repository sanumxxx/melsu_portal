import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../common/Card';
import Button from '../../common/Button';
import Input from '../../common/Input';

const SLASettings = ({ slaHours, setSlaHours, escalationRules, setEscalationRules }) => {
  const addEscalationRule = () => {
    const newRule = {
      id: Date.now(),
      name: 'Новое правило эскалации',
      trigger_hours: 24,
      escalate_to: 'admin',
      actions: ['notify'],
      is_active: true
    };
    
    setEscalationRules([...escalationRules, newRule]);
  };

  return (
    <div className="space-y-6">
      {/* Основные настройки SLA */}
      <Card>
        <CardHeader>
          <CardTitle>⏰ Настройки SLA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Общий SLA (часы)
              </label>
              <Input
                type="number"
                value={slaHours}
                onChange={(e) => setSlaHours(parseInt(e.target.value))}
                min="1"
                max="8760"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                В рабочих днях
              </label>
              <div className="text-lg font-medium text-blue-600">
                {Math.ceil(slaHours / 8)} дней
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Предупреждение за
              </label>
              <Input
                type="number"
                value={Math.floor(slaHours * 0.8)}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Правила эскалации */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Правила эскалации</CardTitle>
            <Button onClick={addEscalationRule} className="bg-red-600 hover:bg-red-700">
              Добавить правило
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {escalationRules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Название
                    </label>
                    <Input
                      value={rule.name}
                      onChange={(e) => {
                        const updated = escalationRules.map(r => 
                          r.id === rule.id ? { ...r, name: e.target.value } : r
                        );
                        setEscalationRules(updated);
                      }}
                      placeholder="Название правила"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Через (часы)
                    </label>
                    <Input
                      type="number"
                      value={rule.trigger_hours}
                      onChange={(e) => {
                        const updated = escalationRules.map(r => 
                          r.id === rule.id ? { ...r, trigger_hours: parseInt(e.target.value) } : r
                        );
                        setEscalationRules(updated);
                      }}
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Эскалировать к
                    </label>
                    <Input
                      value={rule.escalate_to}
                      onChange={(e) => {
                        const updated = escalationRules.map(r => 
                          r.id === rule.id ? { ...r, escalate_to: e.target.value } : r
                        );
                        setEscalationRules(updated);
                      }}
                      placeholder="Роль или пользователь"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        setEscalationRules(escalationRules.filter(r => r.id !== rule.id));
                      }}
                      variant="outline"
                      className="text-red-600"
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {escalationRules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет настроенных правил эскалации
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Мониторинг SLA */}
      <Card>
        <CardHeader>
          <CardTitle>Мониторинг SLA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">95%</div>
              <div className="text-sm text-green-700">В рамках SLA</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">3%</div>
              <div className="text-sm text-yellow-700">Близко к нарушению</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">2%</div>
              <div className="text-sm text-red-700">Нарушение SLA</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">18ч</div>
              <div className="text-sm text-blue-700">Среднее время</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SLASettings; 