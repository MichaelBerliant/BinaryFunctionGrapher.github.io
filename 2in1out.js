//Creating the scene, camera, renderer, and orbit controls
var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;

var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

var controls = new THREE.OrbitControls(camera, renderer.domElement);

//Creating the grids along with x, y, and z labels
var gridHelperxy = new THREE.GridHelper(100, 10, 0xff0000, 0x000000);
var gridHelperxz = new THREE.GridHelper(100, 10, 0xff0000, 0x000000);
gridHelperxz.rotation.x = -Math.PI/2;
var gridHelperyz = new THREE.GridHelper(100, 10, 0xff0000, 0x000000);
gridHelperyz.rotation.z = -Math.PI/2;

var xLabel = createTextLabel("x", "#000000");
var yLabel = createTextLabel("y", "#000000");
var zLabel = createTextLabel("z", "#000000");

xLabel.position.set(55, 0, 0);
yLabel.position.set(0, 0, -55);
zLabel.position.set(0, 0, 55);

gridHelperxy.add(xLabel);
gridHelperxz.add(zLabel);
gridHelperyz.add(yLabel);

scene.add(gridHelperxy, gridHelperxz, gridHelperyz);

function createTextLabel(text, color) {
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  canvas.width = 64;
  canvas.height = 64;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "Italic 20px Lora";
  context.fillStyle = color;
  var textWidth = context.measureText(text).width;
  context.fillText(text, canvas.width / 2 - textWidth / 2, canvas.height / 2 + 10);

  var texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  var material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true
  });

  var sprite = new THREE.Sprite(material);
  sprite.scale.set(5, 5, 1);

  return sprite;
}

let isFunctionValid = false; // Tracks the validity of function input

//Creation of the plane geometry
var geometry = new THREE.PlaneBufferGeometry(10,10,350,350);

//Getting the output expression after the enter key is pressed in its textarea
const functionInput = document.getElementById('function-input');
functionInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        if (validateInput()) {
            updateMaterial();
            updatePosition();
        }
    }
});

//Error handling of the function
function validateInput() {
    const errorDisplay = document.getElementById('error-display');
    const functionStr = functionInput.value;

    //Helper function to check balanced parentheses and brackets
    function isBalanced(expression) {
        const stack = [];
        for (const char of expression) {
            if (char === '(' || char === '[') stack.push(char);
            if (char === ')' || char === ']') {
                if (stack.length === 0) return false;
                const last = stack.pop();
                if ((char === ')' && last !== '(') || (char === ']' && last !== '[')) {
                    return false;
                }
            }
        }
        return stack.length === 0;
    }

    //Helper function to check for invalid consecutive operators
    function hasInvalidOperators(expression) {
        const validOperators = ['**', '==', '!=', '>=', '<=', '<<', '>>', '>>>'];
        const regex = /[\+\-\*\/<>=!]{2,}/g;
        const matches = expression.match(regex);

        if (matches) {

            for (const match of matches) {
                if (!validOperators.includes(match)) {
                    return true;
            }
        }
        return false;
    }

    // Helper function to validate `S` function syntax
    function isValidSFunction(expression) {
        const regex = /S\s*\[\s*\d+\s*;\s*\d+\s*;\s*[^;\]]+?\s*\]/g;
        const matches = expression.match(regex);

        if (expression.includes('S') && !matches) {
            return false;
        }

        if (matches) {
            for (const match of matches) {
                if (!/^S\s*\[\s*\d+\s*;\s*\d+\s*;\s*[^;\]]+?\s*\]$/.test(match)) {
                    return false;
                }
            }
        }
        return true;
    }

    try {
        if (!isBalanced(functionStr)) {
            throw new Error("Unmatched or misnested parentheses in the function.");
        }

        if (hasInvalidOperators(functionStr)) {
            throw new Error("Invalid consecutive operators found.");
        }

        if (functionStr.includes('S') && !isValidSFunction(functionStr)) {
            throw new Error("Invalid syntax for S function. Ensure proper square brackets and semicolons.");
        }

        // Validate scope
        let scopeValue = scope.value.trim(); // Trim whitespace
        if (scopeValue === '') {
            scopeValue = '10'; // Default value for empty scope
            scope.value = '10'; // Update the input field visually
        }
        if (!/^\d+(\.\d+)?$/.test(scopeValue)) {
            throw new Error("Scope must be a positive decimal number in base-10 format.");
        }

        const transformedFunctionStr = replaceMathFunctions(functionStr);
        const testFunction = new Function('x', 'y', `return ${transformedFunctionStr};`);

        // Test execution to catch runtime math errors
        const sandbox = (fn) => {
            let hasValidOutput = false;

            for (let i = 0; i < geometry.attributes.position.count; i++) {
                const x = geometry.attributes.position.getX(i);
                const y = geometry.attributes.position.getY(i);

                try {
                    const z = fn(x, y);

                    if (isFinite(z)) {
                        hasValidOutput = true;
                        return;
                    }
                } catch (error) {
                    console.error(`Error at x=${x}, y=${y}: ${error.message}`);
                }
            }

            if (!hasValidOutput) {
                throw new Error("No valid output found for the function.");
            }
        };
        sandbox(testFunction);

        errorDisplay.textContent = '';
        isFunctionValid = true;
        return true;
    } catch (error) {
        // Display the error message
        errorDisplay.textContent = `Error: ${error.message}`;
        isFunctionValid = false;
        return false;
    }
}

function replaceMathFunctions(expression) {
  //Appending Math. to all javascript math objects
  const mathFunctions = ['E','PI','abs','acos','acosh','asin','asinh','atan','atan2', 'atanh','cbrt','ceil','clz32', 'cos','cosh', 'exp','expm1', 'floor','fround','hypot','imul','log','log10', 'log1p', 'log2', 'max', 'min', 'pow', 'random', 'round', 'sign','sin', 'sinh','sqrt', 'tan','tanh', 'trunc'];

  for (const func of mathFunctions) {
    const regex = new RegExp(`\\b${func}\\b`, 'g');
    expression = expression.replace(regex, `Math.${func}`);
  }

  //Translates the summation function into a form that is readable to javascript
  function replaceNestedS(input) {
    const regex = /S\s*\[\s*(\d+)\s*;\s*(\d+)\s*;\s*([^;\]]*?)\s*\]/g;
    const modifiedString = input.replace(regex, (_, a, b, c) => {
      if (c.includes('S')) {
        c = replaceNestedS(c);
      }
      let result = '(';
      for (let i = 0; i < a; i++) {
        const d = c.replace(/j/g, String(Number(b) + i));

        result += '(' + d + ')' + (i < a - 1 ? ' + ' : '');
      }
      result += ')';
      return result;
    });
    return modifiedString;
  }
  //Since it replaces the summation functions by innermost order, it runs through until each layer is replaced
  while(expression.includes('S')){
    expression = replaceNestedS(expression);
  }
  //Make all parentheses round
  expression = expression.replace(/\[/g, '(').replace(/\]/g, ')');

  return expression;
}

//Calculating the light direction that will make the graph the brightest, which is the one that is underneath the graph the least
function lightDirection() {
  const functionStr = replaceMathFunctions(functionInput.value);
  const positionFunc = new Function('x', 'y', `return ${functionStr};`);

  const solutions = [0,0,0,0]
  const step = 0.01;

  for (let i = 0; i < 1000; i++) {
    if (positionFunc((-5 + i * step), (-5 + i * step)) >= ((-5 + i * step)+(-5 + i * step))/2) {
      if((-5 + i * step) >= 0){ solutions[0]++;}
    }
    if (positionFunc((-5 + i * step), (-5 + i * step)) >= -((-5 + i * step)+(-5 + i * step))/2) {
      if((-5 + i * step) <= 0){ solutions[1]++;}
    }
    if (positionFunc((-5 + i * step), (5 - i * step)) >= ((-5 + i * step)-(5 - i * step))/2) {
      if((5 - i * step) >= 0){ solutions[2]++;}
    }
    if (positionFunc((-5 + i * step), (5 - i * step)) >= (-(-5 + i * step)+(5 - i * step))/2) {
      if((5 - i * step) <= 0){ solutions[3]++;}
    }
  }
  if(solutions.indexOf(Math.min.apply(null,solutions)) == 0){ return [1,1,1];}
  if(solutions.indexOf(Math.min.apply(null,solutions)) == 1){ return [-1,-1,1];}
  if(solutions.indexOf(Math.min.apply(null,solutions)) == 2){ return [-1,1,1];}
  if(solutions.indexOf(Math.min.apply(null,solutions)) == 3){ return [1,-1,1];}
}

//Creating a custom material that colours each point based on its slope and shades each point based on the calculation of three different lights
const material = new THREE.ShaderMaterial({
  uniforms: {
      light: { type: 'vec3', value: new THREE.Vector3(...lightDirection()) },
      color1: {type: 'vec3', value: new THREE.Color(0xff0000)},
      color2: {type: 'vec3', value: new THREE.Color(0xff6600)},
      color3: {type: 'vec3', value: new THREE.Color(0xffff00)},
      color4: {type: 'vec3', value: new THREE.Color(0x00ff00)},
      color5: {type: 'vec3', value: new THREE.Color(0x00ffff)},
      color6: {type: 'vec3', value: new THREE.Color(0x0026ff)}
  },
  side: THREE.DoubleSide,
  vertexShader:  `
    varying vec3 vUv;
    varying vec3 vNormal;

    void main() {
      vUv = position;
      vNormal = normal;

      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `,
  fragmentShader: `
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  uniform vec3 color4;
  uniform vec3 color5;
  uniform vec3 color6;
  uniform vec3 light;
  varying vec3 vUv;
  varying vec3 vNormal;

  void main() {
      vec3 light1 = normalize(light);

      vec3 ambient = vec3(0.5, 0.5, 0.5);
      vec3 diffuse = vec3(0.7, 0.7, 0.7);
      vec3 specular = vec3(0.5, 0.5, 0.5);

      float shininess = 32.0;

      vec3 surfaceColor = vec3(0.0);
      float slope = length(vNormal.xy);
      if(slope < 0.2){
          surfaceColor = mix(color1, color2, slope*5.0);
      } else if(slope < 0.4){
          surfaceColor = mix(color2, color3, (slope-0.2)*5.0);
      } else if(slope < 0.6){
          surfaceColor = mix(color3, color4, (slope-0.4)*5.0);
      } else if(slope < 0.8){
          surfaceColor = mix(color4, color5, (slope-0.6)*5.0);
      } else if(slope < 1.0){
          surfaceColor = mix(color5, color6, (slope-0.8)*5.0);
      } else {
          surfaceColor = color6;
      }

      vec3 ambientColor = ambient * surfaceColor;
      vec3 diffuseColor1 = diffuse * surfaceColor * max(dot(vNormal, light1), 0.0);
      vec3 reflectDir1 = reflect(-light1, vNormal);
      vec3 viewDir1 = normalize(-vNormal);
      vec3 specularColor1 = specular * pow(max(dot(viewDir1, reflectDir1), 0.0), shininess);

      gl_FragColor = vec4(ambientColor + diffuseColor1 + specularColor1, 1.0);
  }
  `
});

//Allows for the material to make calculations with the vector returned by lightDirection()
function updateMaterial() {
  if (!isFunctionValid) return;
  const lightDir = lightDirection();
  material.uniforms.light.value.set(lightDir[0], lightDir[1], lightDir[2]);
}
functionInput.addEventListener('change', updateMaterial);
updateMaterial();

//Creation of the horizontal plane mesh
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI/2
scene.add(plane);

//Getting the size of the plane after the enter key is pressed in its textarea
const scope = document.getElementById('scope');
scope.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        if (validateInput()) {
            updateScope();
        }
    }
});

//Changes the plane geometry to have the height and width of size scope
function updateScope() {
  if (scope.value > 0) {
    geometry.dispose();
    const newGeometry = new THREE.PlaneBufferGeometry(scope.value, scope.value, 350, 350);
    plane.geometry = newGeometry;
    geometry = newGeometry;
  }
}

//Changing the z-coordinate of each point in the plane mesh to follow the output expression and adjusting their normal vectors to match the new shape of the plane mesh. This needs to be rendered contantly so that the graph can be moved around and seen from different sides.
let renderLoop; // Global variable to store the render loop ID

function updatePosition() {
    if (!isFunctionValid) return;
    const functionStr = replaceMathFunctions(functionInput.value);
    const positionFunc = new Function('x', 'y', `return ${functionStr};`);

    // Stop any previous rendering loop
    if (renderLoop) {
        cancelAnimationFrame(renderLoop);
        renderLoop = null; // Clear the previous loop ID
    }

    function render() {
        // Update plane geometry
        for (let i = 0; i < geometry.attributes.position.count; i++) {
            const x = geometry.attributes.position.getX(i);
            const y = geometry.attributes.position.getY(i);
            const z = positionFunc(x, y); // Calculate new z-coordinate

            geometry.attributes.position.setZ(i, z);
        }
        geometry.computeVertexNormals();
        geometry.attributes.position.needsUpdate = true;

        // Render the scene
        renderer.render(scene, camera);

        // Request the next frame
        renderLoop = requestAnimationFrame(render);
    }

    // Start the rendering loop
    render();
}
