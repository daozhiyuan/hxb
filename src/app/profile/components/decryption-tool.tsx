'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, KeyRound, Lock, Unlock, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DecryptionToolProps {
  isSuperAdmin: boolean;
}

export default function DecryptionTool({ isSuperAdmin }: DecryptionToolProps) {
  const [encryptedText, setEncryptedText] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState('');
  const [formatInfo, setFormatInfo] = useState('');
  const [activeTab, setActiveTab] = useState('tool');

  // 识别加密格式
  useEffect(() => {
    if (!encryptedText) {
      setFormatInfo('');
      return;
    }
    
    // 检测特殊格式
    if (encryptedText.startsWith('tkl1') || encryptedText.includes('/9x') || encryptedText.length >= 60) {
      setFormatInfo('已识别：特殊格式加密数据（使用专用解密方法）');
    } 
    // 检测URL安全Base64格式
    else if (/^[A-Za-z0-9_-]+$/.test(encryptedText) && !encryptedText.includes(':')) {
      setFormatInfo('已识别：URL安全的Base64格式');
    }
    // 检测标准加密格式
    else if (encryptedText.includes(':') && /^[0-9a-f]+:[0-9a-f]+$/i.test(encryptedText)) {
      setFormatInfo('已识别：标准加密格式 (IV:EncryptedHex)');
    }
    // 检测可能是明文身份证
    else if (/^\d{17}[\dX]$/i.test(encryptedText)) {
      setFormatInfo('可能是未加密的身份证号码');
    }
    else {
      setFormatInfo('未识别的格式');
    }
  }, [encryptedText]);

  if (!isSuperAdmin) {
    return null;
  }

  const handleDecrypt = async () => {
    if (!encryptedText) {
      toast.warning('请输入需要解密的数据');
      return;
    }

    setIsDecrypting(true);
    setError('');
    setDecryptedText('');

    try {
      const response = await fetch('/api/admin/decrypt-idcard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ encryptedText }),
      });

      const data = await response.json();

      if (data.success) {
        setDecryptedText(data.decryptedText);
        toast.success('解密成功');
      } else {
        setError(data.error || '解密失败');
        toast.error('解密失败: ' + (data.error || '未知错误'));
      }
    } catch (err) {
      console.error('解密请求失败:', err);
      setError('解密请求失败，请稍后重试');
      toast.error('解密请求失败，请稍后重试');
    } finally {
      setIsDecrypting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('已复制到剪贴板'))
      .catch(() => toast.error('复制失败，请手动复制'));
  };

  // 格式化分类选项卡内容
  const formatInfoContent = (
    <div className="text-sm">
      <h3 className="font-bold mb-2">支持的加密格式</h3>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span className="font-medium">标准格式</span>: 
          <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">IV:EncryptedHex</code>
          <p className="text-xs text-gray-600 mt-1">使用十六进制表示IV和加密数据，以冒号分隔。例如：<code className="bg-gray-100 px-1 rounded">a1b2c3d4e5f6g7h8:5d7f8e...等</code></p>
        </li>
        <li>
          <span className="font-medium">Base64格式</span>:
          <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">Base64(IV+EncryptedData)</code>
          <p className="text-xs text-gray-600 mt-1">使用Base64编码完整数据（包含IV和加密内容）。例如：<code className="bg-gray-100 px-1 rounded">YWJjZGVmZ2g...</code></p>
        </li>
        <li>
          <span className="font-medium">URL安全的Base64格式</span>:
          <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">Base64Safe(IV+EncryptedData)</code>
          <p className="text-xs text-gray-600 mt-1">使用URL安全的Base64编码，将+替换为-，/替换为_。例如：<code className="bg-gray-100 px-1 rounded">YWJjZGVm...</code></p>
        </li>
        <li>
          <span className="font-medium">特殊格式</span>:
          <code className="ml-1 px-1 py-0.5 bg-gray-100 rounded text-xs">tkl1...</code>
          <p className="text-xs text-gray-600 mt-1">系统中存在一些使用特殊格式加密的数据，工具会尝试多种解密方法。</p>
          <div className="mt-1 p-1 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
            特殊格式通常以"tkl1"开头，或包含"/9x"字符，解密工具会自动尝试多种解密算法。
          </div>
        </li>
      </ul>
      
      <h3 className="font-bold mt-4 mb-2">解密失败？</h3>
      <p className="text-xs text-gray-600">
        如果解密失败，可能是因为：
      </p>
      <ul className="list-disc pl-5 space-y-1 mt-2 text-xs text-gray-600">
        <li>输入的数据不是有效的加密格式</li>
        <li>使用了不同的加密密钥（环境变量ENCRYPTION_KEY）</li>
        <li>加密方法使用了自定义的IV或填充方式</li>
        <li>数据在加密前进行了额外处理</li>
      </ul>
      
      <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
        <p className="font-medium text-yellow-800">安全警告</p>
        <p className="mt-1 text-yellow-700">请妥善保管解密的敏感数据，不要在不安全的环境中使用此工具。</p>
      </div>
      
      <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded text-xs">
        <p className="font-medium text-green-800">关于特殊格式</p>
        <p className="mt-1 text-green-700">系统已完善对特殊格式加密数据的解密支持，包括tkl1开头和其他特殊格式。如遇解密失败，请联系系统管理员。</p>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <ShieldAlert className="w-5 h-5 mr-2 text-yellow-500" />
          证件号码解密工具
          <span className="text-xs ml-2 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
            仅超级管理员可用
          </span>
        </CardTitle>
        <CardDescription>
          此工具可解密系统中的加密证件号码，请谨慎使用并保护好敏感信息
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tool">解密工具</TabsTrigger>
          <TabsTrigger value="info">格式说明</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tool">
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="encrypted-input" className="text-sm font-medium flex items-center">
                <Lock className="w-4 h-4 mr-1" />
                加密数据
              </label>
              <div className="flex space-x-2">
                <Input
                  id="encrypted-input"
                  value={encryptedText}
                  onChange={(e) => setEncryptedText(e.target.value)}
                  placeholder="输入需要解密的数据..."
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setEncryptedText('')}
                  title="清空输入"
                >
                  ×
                </Button>
              </div>
              
              {formatInfo && (
                <div className="text-xs text-blue-600 flex items-center mt-1">
                  <Info className="h-3 w-3 mr-1" />
                  {formatInfo}
                </div>
              )}
            </div>

            {decryptedText && (
              <div className="space-y-2">
                <label htmlFor="decrypted-output" className="text-sm font-medium flex items-center">
                  <Unlock className="w-4 h-4 mr-1" />
                  解密结果
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 font-mono bg-green-50 border border-green-200 rounded p-2 break-all">
                    {decryptedText}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(decryptedText)}
                    title="复制到剪贴板"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm flex items-start p-2 bg-red-50 rounded border border-red-200">
                <AlertTriangle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">解密失败</div>
                  <div className="text-xs">{error}</div>
                  {error.includes('特殊格式') && (
                    <div className="text-xs mt-1">
                      这种格式可能使用了自定义加密方法，系统正在尝试添加更多解密支持。
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            <Button 
              onClick={handleDecrypt} 
              disabled={isDecrypting || !encryptedText} 
              className="w-full"
            >
              {isDecrypting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  正在解密...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  解密
                </>
              )}
            </Button>
          </CardFooter>
        </TabsContent>
        
        <TabsContent value="info">
          <CardContent className="space-y-4">
            {formatInfoContent}
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
} 