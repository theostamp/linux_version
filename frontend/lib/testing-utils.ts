// Testing utilities for kiosk application

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  timestamp: Date;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  passedTests: number;
  failedTests: number;
}

// Widget functionality tests
export async function testWidgetFunctionality(): Promise<TestSuite> {
  const suite: TestSuite = {
    name: 'Widget Functionality Tests',
    tests: [],
    totalDuration: 0,
    passedTests: 0,
    failedTests: 0
  };

  const startTime = Date.now();

  // Test widget rendering
  suite.tests.push(await testWidgetRendering());
  
  // Test data loading
  suite.tests.push(await testDataLoading());
  
  // Test error handling
  suite.tests.push(await testErrorHandling());
  
  // Test responsive design
  suite.tests.push(await testResponsiveDesign());

  suite.totalDuration = Date.now() - startTime;
  suite.passedTests = suite.tests.filter(t => t.passed).length;
  suite.failedTests = suite.tests.filter(t => !t.passed).length;

  return suite;
}

async function testWidgetRendering(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Check if widgets are rendered
    const widgets = document.querySelectorAll('[data-testid^="widget-"]');
    
    if (widgets.length === 0) {
      return {
        testName: 'Widget Rendering',
        passed: false,
        message: 'No widgets found on the page',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    // Check if widgets have proper structure
    let validWidgets = 0;
    widgets.forEach(widget => {
      const title = widget.querySelector('[data-testid="widget-title"]');
      const content = widget.querySelector('[data-testid="widget-content"]');
      
      if (title && content) {
        validWidgets++;
      }
    });

    return {
      testName: 'Widget Rendering',
      passed: validWidgets === widgets.length,
      message: `${validWidgets}/${widgets.length} widgets have proper structure`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'Widget Rendering',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

async function testDataLoading(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test API endpoints
    const endpoints = [
      '/api/weather',
      '/api/public-info/1'
    ];

    const results = await Promise.allSettled(
      endpoints.map(endpoint => fetch(endpoint))
    );

    const successfulRequests = results.filter(
      result => result.status === 'fulfilled' && 
      (result.value as Response).ok
    ).length;

    return {
      testName: 'Data Loading',
      passed: successfulRequests > 0,
      message: `${successfulRequests}/${endpoints.length} API endpoints are accessible`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'Data Loading',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

async function testErrorHandling(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test error boundary
    const errorBoundary = document.querySelector('[data-testid="error-boundary"]');
    
    if (!errorBoundary) {
      return {
        testName: 'Error Handling',
        passed: false,
        message: 'Error boundary not found',
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    // Test if error messages are properly displayed
    const errorMessages = document.querySelectorAll('[data-testid="error-message"]');
    
    return {
      testName: 'Error Handling',
      passed: errorBoundary !== null,
      message: `Error boundary found with ${errorMessages.length} error messages`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'Error Handling',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

async function testResponsiveDesign(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];

    let passedViewports = 0;

    for (const viewport of viewports) {
      // Simulate viewport change
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: viewport.width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: viewport.height,
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      // Wait for layout to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if layout is responsive
      const mainContent = document.querySelector('[data-testid="kiosk-main"]');
      if (mainContent) {
        const styles = window.getComputedStyle(mainContent);
        if (styles.display !== 'none') {
          passedViewports++;
        }
      }
    }

    return {
      testName: 'Responsive Design',
      passed: passedViewports === viewports.length,
      message: `${passedViewports}/${viewports.length} viewports render correctly`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'Responsive Design',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

// Performance tests
export async function testPerformance(): Promise<TestSuite> {
  const suite: TestSuite = {
    name: 'Performance Tests',
    tests: [],
    totalDuration: 0,
    passedTests: 0,
    failedTests: 0
  };

  const startTime = Date.now();

  // Test page load time
  suite.tests.push(await testPageLoadTime());
  
  // Test memory usage
  suite.tests.push(await testMemoryUsage());
  
  // Test animation performance
  suite.tests.push(await testAnimationPerformance());

  suite.totalDuration = Date.now() - startTime;
  suite.passedTests = suite.tests.filter(t => t.passed).length;
  suite.failedTests = suite.tests.filter(t => !t.passed).length;

  return suite;
}

async function testPageLoadTime(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const navigationStart = performance.timing?.navigationStart || 0;
    const loadTime = Date.now() - navigationStart;
    
    const maxLoadTime = 3000; // 3 seconds
    const passed = loadTime < maxLoadTime;

    return {
      testName: 'Page Load Time',
      passed,
      message: `Page loaded in ${loadTime}ms (threshold: ${maxLoadTime}ms)`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'Page Load Time',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

async function testMemoryUsage(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const maxMB = 100; // 100MB threshold
      
      const passed = usedMB < maxMB;

      return {
        testName: 'Memory Usage',
        passed,
        message: `Memory usage: ${usedMB.toFixed(2)}MB (threshold: ${maxMB}MB)`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }

    return {
      testName: 'Memory Usage',
      passed: true,
      message: 'Memory API not available',
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'Memory Usage',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

async function testAnimationPerformance(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test FPS during animations
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        return fps;
      }
      
      requestAnimationFrame(measureFPS);
      return null;
    };

    // Start measuring
    const fps = await new Promise<number>((resolve) => {
      const checkFPS = () => {
        const result = measureFPS();
        if (result !== null) {
          resolve(result);
        } else {
          requestAnimationFrame(checkFPS);
        }
      };
      checkFPS();
    });

    const minFPS = 30; // Minimum acceptable FPS
    const passed = fps >= minFPS;

    return {
      testName: 'Animation Performance',
      passed,
      message: `FPS: ${fps} (minimum: ${minFPS})`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'Animation Performance',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

// Accessibility tests
export async function testAccessibility(): Promise<TestSuite> {
  const suite: TestSuite = {
    name: 'Accessibility Tests',
    tests: [],
    totalDuration: 0,
    passedTests: 0,
    failedTests: 0
  };

  const startTime = Date.now();

  // Test keyboard navigation
  suite.tests.push(await testKeyboardNavigation());
  
  // Test ARIA labels
  suite.tests.push(await testAriaLabels());
  
  // Test color contrast
  suite.tests.push(await testColorContrast());

  suite.totalDuration = Date.now() - startTime;
  suite.passedTests = suite.tests.filter(t => t.passed).length;
  suite.failedTests = suite.tests.filter(t => !t.passed).length;

  return suite;
}

async function testKeyboardNavigation(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const focusableElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    let navigableElements = 0;
    focusableElements.forEach(element => {
      if (!element.hasAttribute('disabled')) {
        navigableElements++;
      }
    });

    const passed = navigableElements > 0;

    return {
      testName: 'Keyboard Navigation',
      passed,
      message: `${navigableElements} keyboard-navigable elements found`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'Keyboard Navigation',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

async function testAriaLabels(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const interactiveElements = document.querySelectorAll(
      'button:not([aria-label]):not([aria-labelledby]), input:not([aria-label]):not([aria-labelledby])'
    );
    
    const images = document.querySelectorAll('img:not([alt])');
    
    const totalIssues = interactiveElements.length + images.length;
    const passed = totalIssues === 0;

    return {
      testName: 'ARIA Labels',
      passed,
      message: `${totalIssues} elements missing accessibility labels`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'ARIA Labels',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

async function testColorContrast(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Simplified color contrast test
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    let contrastIssues = 0;

    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Basic check for contrast
      if (color === backgroundColor || color === 'transparent') {
        contrastIssues++;
      }
    });

    const passed = contrastIssues === 0;

    return {
      testName: 'Color Contrast',
      passed,
      message: `${contrastIssues} elements may have contrast issues`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  } catch (error) {
    return {
      testName: 'Color Contrast',
      passed: false,
      message: `Error: ${error}`,
      duration: Date.now() - startTime,
      timestamp: new Date()
    };
  }
}

// Run all tests
export async function runAllTests(): Promise<TestSuite[]> {
  const results = await Promise.all([
    testWidgetFunctionality(),
    testPerformance(),
    testAccessibility()
  ]);

  return results;
}

// Test runner utility
export class TestRunner {
  private results: TestSuite[] = [];

  async runTests(): Promise<TestSuite[]> {
    console.log('🧪 Starting kiosk application tests...');
    
    this.results = await runAllTests();
    
    const totalTests = this.results.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passedTests, 0);
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failedTests, 0);
    
    console.log(`✅ Tests completed: ${totalPassed}/${totalTests} passed`);
    
    if (totalFailed > 0) {
      console.warn(`⚠️ ${totalFailed} tests failed`);
    }
    
    return this.results;
  }

  getResults(): TestSuite[] {
    return this.results;
  }

  getSummary(): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
  } {
    const totalTests = this.results.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = this.results.reduce((sum, suite) => sum + suite.passedTests, 0);
    const failedTests = this.results.reduce((sum, suite) => sum + suite.failedTests, 0);
    
    return {
      totalTests,
      passedTests,
      failedTests,
      successRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
    };
  }
}
