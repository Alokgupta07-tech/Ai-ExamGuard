export interface McqOption {
  label: string;
  content: string;
  isCorrect: boolean;
}

export interface McqQuestionSpec {
  prompt: string;
  points: number;
  options: McqOption[];
  explanation: string;
}

export interface WrittenQuestionSpec {
  prompt: string;
  points: number;
  rubric: string;
  solutionOutline: string;
}

// ============================================================================
// 1. CLA-3 MCQ QUESTIONS (10 MCQs per course x 7 courses = 70 MCQs)
// ============================================================================

export const CLA3_MCQ_BANK: Record<string, McqQuestionSpec[]> = {
  CSE202: [
    {
      prompt: 'Which feature of Object-Oriented Programming binds code and the data it manipulates together into a single unit and keeps both safe from outside interference?',
      points: 1,
      explanation: 'Encapsulation wraps data and methods operating on that data within a class, enforcing access restriction via private/protected members.',
      options: [
        { label: 'A', content: 'Polymorphism', isCorrect: false },
        { label: 'B', content: 'Encapsulation', isCorrect: true },
        { label: 'C', content: 'Inheritance', isCorrect: false },
        { label: 'D', content: 'Dynamic Binding', isCorrect: false },
      ],
    },
    {
      prompt: 'In C++, what is the default access specifier for members of a class if no access specifier is explicitly declared?',
      points: 1,
      explanation: 'By default, members of a C++ class are private, whereas members of a struct are public.',
      options: [
        { label: 'A', content: 'public', isCorrect: false },
        { label: 'B', content: 'protected', isCorrect: false },
        { label: 'C', content: 'private', isCorrect: true },
        { label: 'D', content: 'package-private', isCorrect: false },
      ],
    },
    {
      prompt: 'What type of constructor is called when an object is initialized with another existing object of the same class?',
      points: 1,
      explanation: 'The copy constructor initializes a new object using an existing instance of the same class (Class(const Class &other)).',
      options: [
        { label: 'A', content: 'Default constructor', isCorrect: false },
        { label: 'B', content: 'Parameterized constructor', isCorrect: false },
        { label: 'C', content: 'Copy constructor', isCorrect: true },
        { label: 'D', content: 'Conversion constructor', isCorrect: false },
      ],
    },
    {
      prompt: 'Which keyword in C++ is used to make a non-member function able to access private and protected members of a class?',
      points: 1,
      explanation: 'The friend keyword grants a non-member function or another class access to private and protected class members.',
      options: [
        { label: 'A', content: 'virtual', isCorrect: false },
        { label: 'B', content: 'friend', isCorrect: true },
        { label: 'C', content: 'extern', isCorrect: false },
        { label: 'D', content: 'static', isCorrect: false },
      ],
    },
    {
      prompt: 'Which C++ operator CANNOT be overloaded according to ISO C++ language standards?',
      points: 1,
      explanation: 'The scope resolution operator (::), member selection (.), member pointer (.*), and ternary conditional (?:) cannot be overloaded in C++.',
      options: [
        { label: 'A', content: 'Operator +', isCorrect: false },
        { label: 'B', content: 'Operator []', isCorrect: false },
        { label: 'C', content: 'Operator :: (Scope Resolution)', isCorrect: true },
        { label: 'D', content: 'Operator ->', isCorrect: false },
      ],
    },
    {
      prompt: 'What happens when a base class destructor is NOT declared as virtual, and an object of a derived class is deleted through a base class pointer?',
      points: 1,
      explanation: 'Deleting a derived instance through a non-virtual base pointer causes undefined behavior, typically invoking only the base destructor and leaking derived resources.',
      options: [
        { label: 'A', content: 'The derived class destructor is called properly via RTTI', isCorrect: false },
        { label: 'B', content: 'Only the base class destructor is executed, risking resource leaks and undefined behavior', isCorrect: true },
        { label: 'C', content: 'A compile-time static assertion error occurs', isCorrect: false },
        { label: 'D', content: 'The compiler invokes pure virtual fallback', isCorrect: false },
      ],
    },
    {
      prompt: 'What characterizes an abstract class in C++?',
      points: 1,
      explanation: 'An abstract class in C++ contains at least one pure virtual function (virtual void fn() = 0;) and cannot be directly instantiated.',
      options: [
        { label: 'A', content: 'It contains only static member variables', isCorrect: false },
        { label: 'B', content: 'It contains at least one pure virtual function declared with = 0', isCorrect: true },
        { label: 'C', content: 'It has no member methods declared', isCorrect: false },
        { label: 'D', content: 'It must be declared with the final specifier', isCorrect: false },
      ],
    },
    {
      prompt: 'In C++ virtual inheritance, what problem is specifically resolved when multiple base classes share a common ancestor?',
      points: 1,
      explanation: 'Virtual base classes eliminate duplicate sub-objects in the Dreaded Diamond problem of multiple inheritance.',
      options: [
        { label: 'A', content: 'Circular inclusion dependency', isCorrect: false },
        { label: 'B', content: 'The Diamond problem (ambiguous duplicate base sub-objects)', isCorrect: true },
        { label: 'C', content: 'Stack overflow in template specialization', isCorrect: false },
        { label: 'D', content: 'Virtual function table memory bloat', isCorrect: false },
      ],
    },
    {
      prompt: 'Which pointer in C++ member methods points directly to the object on which the non-static member method was invoked?',
      points: 1,
      explanation: 'The this pointer is an implicit rvalue parameter passed to non-static member functions pointing to the invoking instance.',
      options: [
        { label: 'A', content: 'self', isCorrect: false },
        { label: 'B', content: 'this', isCorrect: true },
        { label: 'C', content: 'super', isCorrect: false },
        { label: 'D', content: 'base', isCorrect: false },
      ],
    },
    {
      prompt: 'What happens when an exception is thrown inside a C++ constructor body before initialization completes?',
      points: 1,
      explanation: 'When an exception escapes a constructor, already constructed base and member sub-objects are destroyed, but the destructor of the incomplete object itself is NOT called.',
      options: [
        { label: 'A', content: 'The destructor of the class being constructed is executed', isCorrect: false },
        { label: 'B', content: 'Already constructed sub-objects are destroyed in reverse order, and the object destructor is not called', isCorrect: true },
        { label: 'C', content: 'std::terminate is immediately called without unwinding', isCorrect: false },
        { label: 'D', content: 'The memory allocated on heap is corrupted permanently', isCorrect: false },
      ],
    },
  ],

  CSE203: [
    {
      prompt: 'What is the truth value of the implication P -> Q when P is FALSE and Q is FALSE?',
      points: 1,
      explanation: 'Material implication P -> Q is vacuously true whenever the antecedent P is false, regardless of Q.',
      options: [
        { label: 'A', content: 'False', isCorrect: false },
        { label: 'B', content: 'True', isCorrect: true },
        { label: 'C', content: 'Indeterminate', isCorrect: false },
        { label: 'D', content: 'Contradiction', isCorrect: false },
      ],
    },
    {
      prompt: 'Which of the following is logically equivalent to the contrapositive of the conditional statement P -> Q?',
      points: 1,
      explanation: 'The contrapositive of P -> Q is ~Q -> ~P, which is strictly logically equivalent to P -> Q.',
      options: [
        { label: 'A', content: 'Q -> P', isCorrect: false },
        { label: 'B', content: '~P -> ~Q', isCorrect: false },
        { label: 'C', content: '~Q -> ~P', isCorrect: true },
        { label: 'D', content: 'P ^ ~Q', isCorrect: false },
      ],
    },
    {
      prompt: 'A relation R on a set A is an equivalence relation if and only if it satisfies which three properties?',
      points: 1,
      explanation: 'An equivalence relation is reflexive (aRa), symmetric (aRb -> bRa), and transitive (aRb ^ bRc -> aRc).',
      options: [
        { label: 'A', content: 'Reflexive, Antisymmetric, Transitive', isCorrect: false },
        { label: 'B', content: 'Reflexive, Symmetric, Transitive', isCorrect: true },
        { label: 'C', content: 'Irreflexive, Symmetric, Asymmetric', isCorrect: false },
        { label: 'D', content: 'Reflexive, Irreflexive, Connected', isCorrect: false },
      ],
    },
    {
      prompt: 'How many distinct subsets does a finite set with n elements contain in its power set?',
      points: 1,
      explanation: 'The power set P(S) of a set with |S| = n has exactly 2^n subsets.',
      options: [
        { label: 'A', content: 'n^2', isCorrect: false },
        { label: 'B', content: '2^n', isCorrect: true },
        { label: 'C', content: '2n', isCorrect: false },
        { label: 'D', content: 'n!', isCorrect: false },
      ],
    },
    {
      prompt: 'By the Pigeonhole Principle, what is the minimum number of students required in a room to guarantee that at least two share the same birth month?',
      points: 1,
      explanation: 'There are 12 months (holes). By Pigeonhole Principle, n = 12 + 1 = 13 students guarantees at least two share a month.',
      options: [
        { label: 'A', content: '12', isCorrect: false },
        { label: 'B', content: '13', isCorrect: true },
        { label: 'C', content: '24', isCorrect: false },
        { label: 'D', content: '366', isCorrect: false },
      ],
    },
    {
      prompt: 'According to the Handshaking Theorem in graph theory, what is the sum of degrees of all vertices in any undirected graph G = (V, E)?',
      points: 1,
      explanation: 'Every edge has two endpoints; thus, the sum of degrees of all vertices equals 2 * |E|.',
      options: [
        { label: 'A', content: '|E|', isCorrect: false },
        { label: 'B', content: '2 * |E|', isCorrect: true },
        { label: 'C', content: '|V| * (|V| - 1)', isCorrect: false },
        { label: 'D', content: '|E| / 2', isCorrect: false },
      ],
    },
    {
      prompt: 'In Boolean algebra, what is the dual of the identity x + (y * z) = (x + y) * (x + z)?',
      points: 1,
      explanation: 'Dual is obtained by swapping + and * and 0 and 1: x * (y + z) = (x * y) + (x * z).',
      options: [
        { label: 'A', content: 'x * (y + z) = (x * y) + (x * z)', isCorrect: true },
        { label: 'B', content: 'x + (y + z) = (x + y) + z', isCorrect: false },
        { label: 'C', content: 'x\' * (y\' + z\') = (x\' * y\') + z\'', isCorrect: false },
        { label: 'D', content: 'x * y * z = x + y + z', isCorrect: false },
      ],
    },
    {
      prompt: 'How many edges are present in a tree with n vertices?',
      points: 1,
      explanation: 'Any connected acyclic graph (tree) with n vertices has exactly n - 1 edges.',
      options: [
        { label: 'A', content: 'n', isCorrect: false },
        { label: 'B', content: 'n - 1', isCorrect: true },
        { label: 'C', content: 'n + 1', isCorrect: false },
        { label: 'D', content: 'n * (n - 1) / 2', isCorrect: false },
      ],
    },
    {
      prompt: 'Which property holds true for any partial order relation (POSET)?',
      points: 1,
      explanation: 'A partially ordered set (POSET) requires reflexivity, antisymmetry (if aRb and bRa then a = b), and transitivity.',
      options: [
        { label: 'A', content: 'Reflexive, Symmetric, and Transitive', isCorrect: false },
        { label: 'B', content: 'Reflexive, Antisymmetric, and Transitive', isCorrect: true },
        { label: 'C', content: 'Irreflexive, Asymmetric, and Non-transitive', isCorrect: false },
        { label: 'D', content: 'Symmetric, Connected, and Dense', isCorrect: false },
      ],
    },
    {
      prompt: 'What is the coefficient of x^3 * y^4 in the algebraic expansion of (x + y)^7 using the Binomial Theorem?',
      points: 1,
      explanation: 'By binomial theorem, coefficient is C(7, 3) = 7! / (3! * 4!) = (7 * 6 * 5) / (3 * 2 * 1) = 35.',
      options: [
        { label: 'A', content: '21', isCorrect: false },
        { label: 'B', content: '35', isCorrect: true },
        { label: 'C', content: '42', isCorrect: false },
        { label: 'D', content: '70', isCorrect: false },
      ],
    },
  ],

  CSE204: [
    {
      prompt: 'What is the tight asymptotic time complexity of Merge Sort in the worst, average, and best cases?',
      points: 1,
      explanation: 'Merge Sort consistently divides the input array in halves (log n levels) and performs O(n) merging at each level, yielding O(n log n) in all cases.',
      options: [
        { label: 'A', content: 'O(n^2)', isCorrect: false },
        { label: 'B', content: 'O(n log n)', isCorrect: true },
        { label: 'C', content: 'O(n)', isCorrect: false },
        { label: 'D', content: 'O(log n)', isCorrect: false },
      ],
    },
    {
      prompt: 'What is the asymptotic solution of the recurrence relation T(n) = 2T(n/2) + O(n) according to the Master Theorem?',
      points: 1,
      explanation: 'Here a = 2, b = 2, f(n) = O(n). Since log_b(a) = log_2(2) = 1, and f(n) = Theta(n^1), Master Theorem Case 2 applies: T(n) = Theta(n log n).',
      options: [
        { label: 'A', content: 'Theta(n)', isCorrect: false },
        { label: 'B', content: 'Theta(n log n)', isCorrect: true },
        { label: 'C', content: 'Theta(n^2)', isCorrect: false },
        { label: 'D', content: 'Theta(log n)', isCorrect: false },
      ],
    },
    {
      prompt: 'What is the worst-case time complexity of standard Quicksort when the pivot is always chosen as the smallest or largest element?',
      points: 1,
      explanation: 'Unbalanced partitions of sizes 0 and n - 1 yield the recurrence T(n) = T(n - 1) + O(n), which resolves to O(n^2).',
      options: [
        { label: 'A', content: 'O(n log n)', isCorrect: false },
        { label: 'B', content: 'O(n^2)', isCorrect: true },
        { label: 'C', content: 'O(log n)', isCorrect: false },
        { label: 'D', content: 'O(n)', isCorrect: false },
      ],
    },
    {
      prompt: 'Which algorithmic paradigm is employed by Dijkstra\'s Single Source Shortest Path algorithm on non-negative weighted graphs?',
      points: 1,
      explanation: 'Dijkstra greedily chooses the unvisited vertex with the minimum tentative distance at each step.',
      options: [
        { label: 'A', content: 'Dynamic Programming', isCorrect: false },
        { label: 'B', content: 'Greedy Method', isCorrect: true },
        { label: 'C', content: 'Divide and Conquer', isCorrect: false },
        { label: 'D', content: 'Backtracking', isCorrect: false },
      ],
    },
    {
      prompt: 'What is the time complexity of building a Binary Heap of n elements using the bottom-up Floyd\'s build-heap algorithm?',
      points: 1,
      explanation: 'Sum of heights over all nodes: sum_{h=0}^{log n} (n / 2^{h+1}) * O(h) converges to O(n).',
      options: [
        { label: 'A', content: 'O(n log n)', isCorrect: false },
        { label: 'B', content: 'O(n)', isCorrect: true },
        { label: 'C', content: 'O(log n)', isCorrect: false },
        { label: 'D', content: 'O(n^2)', isCorrect: false },
      ],
    },
    {
      prompt: 'Which algorithm is best suited to find single-source shortest paths in a directed graph that contains negative edge weights but no negative cycles?',
      points: 1,
      explanation: 'The Bellman-Ford algorithm relaxes all |E| edges |V| - 1 times and correctly handles negative edge weights, detecting negative cycles if they exist.',
      options: [
        { label: 'A', content: 'Dijkstra\'s algorithm', isCorrect: false },
        { label: 'B', content: 'Bellman-Ford algorithm', isCorrect: true },
        { label: 'C', content: 'Prim\'s algorithm', isCorrect: false },
        { label: 'D', content: 'Kruskal\'s algorithm', isCorrect: false },
      ],
    },
    {
      prompt: 'In Dynamic Programming, what are the two essential characteristics required for a problem to be solvable via DP?',
      points: 1,
      explanation: 'Optimal substructure (optimal solution contains optimal sub-solutions) and overlapping subproblems (subproblems recur rather than generating fresh instances).',
      options: [
        { label: 'A', content: 'Greedy choice property and disjoint subproblems', isCorrect: false },
        { label: 'B', content: 'Optimal substructure and overlapping subproblems', isCorrect: true },
        { label: 'C', content: 'Divide and conquer decomposition and linear recursion', isCorrect: false },
        { label: 'D', content: 'Deterministic state machine and bounded memory', isCorrect: false },
      ],
    },
    {
      prompt: 'What is the space complexity of solving the 0/1 Knapsack problem with n items and capacity W using a standard 2D DP table?',
      points: 1,
      explanation: 'The standard dynamic programming matrix has dimensions (n + 1) * (W + 1), giving O(n * W) space complexity.',
      options: [
        { label: 'A', content: 'O(n + W)', isCorrect: false },
        { label: 'B', content: 'O(n * W)', isCorrect: true },
        { label: 'C', content: 'O(2^n)', isCorrect: false },
        { label: 'D', content: 'O(W)', isCorrect: false },
      ],
    },
    {
      prompt: 'What disjoint-set data structure optimization achieves near-linear O(m * alpha(n)) amortized performance in Kruskal\'s MST algorithm?',
      points: 1,
      explanation: 'Union by rank/size combined with path compression guarantees almost linear performance governed by the inverse Ackermann function alpha(n).',
      options: [
        { label: 'A', content: 'Binary search tree rebalancing', isCorrect: false },
        { label: 'B', content: 'Union by rank combined with Path Compression', isCorrect: true },
        { label: 'C', content: 'Fibonacci heap cascading cuts', isCorrect: false },
        { label: 'D', content: 'Breadth-first frontier indexing', isCorrect: false },
      ],
    },
    {
      prompt: 'Which complexity class contains decision problems whose solutions can be verified in polynomial time by a deterministic Turing machine?',
      points: 1,
      explanation: 'Class NP (Nondeterministic Polynomial time) is defined as the set of decision problems verifiable by a deterministic machine in polynomial time given a certificate.',
      options: [
        { label: 'A', content: 'P', isCorrect: false },
        { label: 'B', content: 'NP', isCorrect: true },
        { label: 'C', content: 'EXPTIME', isCorrect: false },
        { label: 'D', content: 'PSPACE', isCorrect: false },
      ],
    },
  ],

  CSE207: [
    {
      prompt: 'What is the decimal equivalent of the hexadecimal number 2E_16?',
      points: 1,
      explanation: '2E_16 = 2 * 16^1 + 14 * 16^0 = 32 + 14 = 46 in decimal.',
      options: [
        { label: 'A', content: '44', isCorrect: false },
        { label: 'B', content: '46', isCorrect: true },
        { label: 'C', content: '48', isCorrect: false },
        { label: 'D', content: '52', isCorrect: false },
      ],
    },
    {
      prompt: 'According to De Morgan\'s theorem, what is the simplified form of (A + B)\'?',
      points: 1,
      explanation: '(A + B)\' = A\' * B\' (the complement of a sum is the product of complements).',
      options: [
        { label: 'A', content: 'A\' + B\'', isCorrect: false },
        { label: 'B', content: 'A\' * B\'', isCorrect: true },
        { label: 'C', content: 'A * B', isCorrect: false },
        { label: 'D', content: '(A * B)\'', isCorrect: false },
      ],
    },
    {
      prompt: 'How many cells are present in a 4-variable Karnaugh Map (K-map)?',
      points: 1,
      explanation: 'A Karnaugh map for n variables has 2^n cells. For n = 4, 2^4 = 16 cells.',
      options: [
        { label: 'A', content: '8', isCorrect: false },
        { label: 'B', content: '16', isCorrect: true },
        { label: 'C', content: '32', isCorrect: false },
        { label: 'D', content: '64', isCorrect: false },
      ],
    },
    {
      prompt: 'Which universal logic gates can implement any Boolean function without using any other type of gate?',
      points: 1,
      explanation: 'NAND and NOR gates are universal gates capable of implementing AND, OR, and NOT operations directly.',
      options: [
        { label: 'A', content: 'AND and OR', isCorrect: false },
        { label: 'B', content: 'NAND and NOR', isCorrect: true },
        { label: 'C', content: 'XOR and XNOR', isCorrect: false },
        { label: 'D', content: 'NOT and BUFFER', isCorrect: false },
      ],
    },
    {
      prompt: 'What are the sum (S) and carry (C) outputs of a Half Adder with inputs A and B?',
      points: 1,
      explanation: 'S = A XOR B, and C = A AND B.',
      options: [
        { label: 'A', content: 'S = A + B, C = A * B', isCorrect: false },
        { label: 'B', content: 'S = A ^ B (XOR), C = A * B (AND)', isCorrect: true },
        { label: 'C', content: 'S = A\' * B, C = A + B', isCorrect: false },
        { label: 'D', content: 'S = (A * B)\', C = A ^ B', isCorrect: false },
      ],
    },
    {
      prompt: 'How many select lines are required for an 8-to-1 Multiplexer?',
      points: 1,
      explanation: 'An N-to-1 multiplexer requires m select lines where 2^m = N. For 8 inputs, 2^3 = 8, so m = 3.',
      options: [
        { label: 'A', content: '2', isCorrect: false },
        { label: 'B', content: '3', isCorrect: true },
        { label: 'C', content: '4', isCorrect: false },
        { label: 'D', content: '8', isCorrect: false },
      ],
    },
    {
      prompt: 'What is the characteristic behavior of a J-K Flip-Flop when both J and K inputs are set to logic HIGH (1) and a clock pulse arrives?',
      points: 1,
      explanation: 'When J=1 and K=1, the J-K flip-flop toggles its output Q_{next} = Q\'.',
      options: [
        { label: 'A', content: 'No change (Memory)', isCorrect: false },
        { label: 'B', content: 'Reset to 0', isCorrect: false },
        { label: 'C', content: 'Toggle (invert previous state)', isCorrect: true },
        { label: 'D', content: 'Invalid indeterminate state', isCorrect: false },
      ],
    },
    {
      prompt: 'What is the maximum modulus (count capacity) of a ripple counter constructed using 4 flip-flops?',
      points: 1,
      explanation: 'An n-bit binary counter constructed with n flip-flops counts from 0 to 2^n - 1, having modulus 2^n. For n = 4, MOD = 2^4 = 16.',
      options: [
        { label: 'A', content: '8', isCorrect: false },
        { label: 'B', content: '16', isCorrect: true },
        { label: 'C', content: '32', isCorrect: false },
        { label: 'D', content: '64', isCorrect: false },
      ],
    },
    {
      prompt: 'What condition creates the race-around problem in level-triggered J-K flip-flops?',
      points: 1,
      explanation: 'The race-around condition occurs when J=1, K=1, and the clock pulse duration t_p is greater than the propagation delay t_{pd} of the flip-flop.',
      options: [
        { label: 'A', content: 'Clock pulse duration t_p < propagation delay t_{pd}', isCorrect: false },
        { label: 'B', content: 'Clock pulse duration t_p > propagation delay t_{pd} while J=1 and K=1', isCorrect: true },
        { label: 'C', content: 'J=0 and K=0 during clock edge', isCorrect: false },
        { label: 'D', content: 'Negative setup time on D input', isCorrect: false },
      ],
    },
    {
      prompt: 'What is a synchronous sequential circuit distinguished by compared to an asynchronous sequential circuit?',
      points: 1,
      explanation: 'In synchronous circuits, all memory elements (flip-flops) change states simultaneously triggered by a common master clock signal.',
      options: [
        { label: 'A', content: 'Lack of feedback paths', isCorrect: false },
        { label: 'B', content: 'All flip-flops are triggered simultaneously by a common clock pulse', isCorrect: true },
        { label: 'C', content: 'Operation independent of clock frequencies', isCorrect: false },
        { label: 'D', content: 'Lower hardware complexity than asynchronous', isCorrect: false },
      ],
    },
  ],

  CSE213: [
    {
      prompt: 'Which Java memory area stores class-level data, method bytecode, static variables, and runtime constant pool?',
      points: 1,
      explanation: 'The JVM Metaspace (formerly PermGen in Java 7 and earlier) stores class metadata, bytecodes, and static variables in native memory.',
      options: [
        { label: 'A', content: 'Heap Memory', isCorrect: false },
        { label: 'B', content: 'Metaspace / Method Area', isCorrect: true },
        { label: 'C', content: 'Java Virtual Machine Stack', isCorrect: false },
        { label: 'D', content: 'Program Counter Register', isCorrect: false },
      ],
    },
    {
      prompt: 'What distinguishes a checked exception from an unchecked exception in Java?',
      points: 1,
      explanation: 'Checked exceptions inherit directly from java.lang.Exception (excluding RuntimeException) and must be declared in throws or caught at compile time.',
      options: [
        { label: 'A', content: 'Checked exceptions are subclasses of RuntimeException', isCorrect: false },
        { label: 'B', content: 'Checked exceptions are checked by the compiler and must be caught or declared', isCorrect: true },
        { label: 'C', content: 'Checked exceptions cause JVM crash immediately', isCorrect: false },
        { label: 'D', content: 'Checked exceptions can only be thrown by native methods', isCorrect: false },
      ],
    },
    {
      prompt: 'Which Collection interface implementation provides synchronized thread-safe operations without locking the entire collection during iteration?',
      points: 1,
      explanation: 'ConcurrentHashMap uses bucket-level locking (synchronized node headers and CAS) allowing concurrent readers and fine-grained writer locking.',
      options: [
        { label: 'A', content: 'Hashtable', isCorrect: false },
        { label: 'B', content: 'ConcurrentHashMap', isCorrect: true },
        { label: 'C', content: 'Vector', isCorrect: false },
        { label: 'D', content: 'Collections.synchronizedMap', isCorrect: false },
      ],
    },
    {
      prompt: 'What occurs during Java Generics Type Erasure at compile-time?',
      points: 1,
      explanation: 'The Java compiler replaces parameterized types with their bounds (or Object) and inserts explicit type casts to maintain binary compatibility.',
      options: [
        { label: 'A', content: 'Generic types are duplicated for each primitive type like C++ templates', isCorrect: false },
        { label: 'B', content: 'Type parameters are removed and replaced with their bounds or Object in bytecode', isCorrect: true },
        { label: 'C', content: 'Generics are resolved via runtime reflection dynamically', isCorrect: false },
        { label: 'D', content: 'The JVM enforces generic type bounds via hardware registers', isCorrect: false },
      ],
    },
    {
      prompt: 'Which state in the Java Thread lifecycle represents a thread waiting indefinitely for another thread to perform a specific action?',
      points: 1,
      explanation: 'Thread.State.WAITING indicates a thread waiting indefinitely via Object.wait(), Thread.join(), or LockSupport.park() without timeout.',
      options: [
        { label: 'A', content: 'BLOCKED', isCorrect: false },
        { label: 'B', content: 'WAITING', isCorrect: true },
        { label: 'C', content: 'TIMED_WAITING', isCorrect: false },
        { label: 'D', content: 'RUNNABLE', isCorrect: false },
      ],
    },
    {
      prompt: 'What is the purpose of the volatile keyword on variable declarations in Java?',
      points: 1,
      explanation: 'volatile guarantees CPU cache coherence (visibility across threads) and establishes happens-before relationships preventing reordering.',
      options: [
        { label: 'A', content: 'Prevents garbage collection of the variable', isCorrect: false },
        { label: 'B', content: 'Guarantees visibility of changes across threads and prevents instruction reordering', isCorrect: true },
        { label: 'C', content: 'Enforces mutual exclusion lock on method entry', isCorrect: false },
        { label: 'D', content: 'Serializes the object to disk automatically', isCorrect: false },
      ],
    },
    {
      prompt: 'In the Java Streams API, which operation is considered a TERMINAL operation that triggers pipeline execution?',
      points: 1,
      explanation: 'collect(), forEach(), reduce(), count() are terminal operations; map(), filter(), flatMap() are intermediate and lazy.',
      options: [
        { label: 'A', content: 'filter()', isCorrect: false },
        { label: 'B', content: 'map()', isCorrect: false },
        { label: 'C', content: 'collect()', isCorrect: true },
        { label: 'D', content: 'distinct()', isCorrect: false },
      ],
    },
    {
      prompt: 'What functional interface is used as the target of a lambda expression that accepts one argument of type T and produces a boolean result?',
      points: 1,
      explanation: 'java.util.function.Predicate<T> defines boolean test(T t).',
      options: [
        { label: 'A', content: 'Function<T, R>', isCorrect: false },
        { label: 'B', content: 'Consumer<T>', isCorrect: false },
        { label: 'C', content: 'Predicate<T>', isCorrect: true },
        { label: 'D', content: 'Supplier<T>', isCorrect: false },
      ],
    },
    {
      prompt: 'Which JDBC object is precompiled by the database engine to safely execute parameterized SQL queries preventing SQL Injection?',
      points: 1,
      explanation: 'PreparedStatement compiles the SQL query once and binds typed parameters safely, preventing injection payloads from mutating query structure.',
      options: [
        { label: 'A', content: 'Statement', isCorrect: false },
        { label: 'B', content: 'PreparedStatement', isCorrect: true },
        { label: 'C', content: 'ResultSet', isCorrect: false },
        { label: 'D', content: 'DriverManager', isCorrect: false },
      ],
    },
    {
      prompt: 'What happens when a static method is declared with the same signature in both a parent class and its subclass in Java?',
      points: 1,
      explanation: 'Static methods are resolved at compile-time based on reference type; this is method hiding, NOT polymorphic overriding.',
      options: [
        { label: 'A', content: 'Polymorphic runtime overriding occurs', isCorrect: false },
        { label: 'B', content: 'Method hiding occurs without dynamic dispatch', isCorrect: true },
        { label: 'C', content: 'Compilation fails with method clash error', isCorrect: false },
        { label: 'D', content: 'The parent method becomes private automatically', isCorrect: false },
      ],
    },
  ],

  ENT243: [
    {
      prompt: 'What document replaces a lengthy traditional business plan during the early customer discovery phase in the Lean Startup methodology?',
      points: 1,
      explanation: 'The Lean Canvas (adapted by Ash Maurya from Osterwalder\'s Business Model Canvas) summarizes value proposition, problem, customer segments, channels, and economics on one page.',
      options: [
        { label: 'A', content: 'Statutory Financial Audit', isCorrect: false },
        { label: 'B', content: 'Lean Canvas', isCorrect: true },
        { label: 'C', content: 'IPO Prospectus (Red Herring)', isCorrect: false },
        { label: 'D', content: 'Organizational By-Laws', isCorrect: false },
      ],
    },
    {
      prompt: 'What metric represents the total cost incurred to acquire a single paying customer?',
      points: 1,
      explanation: 'Customer Acquisition Cost (CAC) = Total Sales & Marketing Spend / Number of New Customers Acquired.',
      options: [
        { label: 'A', content: 'Customer Lifetime Value (LTV)', isCorrect: false },
        { label: 'B', content: 'Customer Acquisition Cost (CAC)', isCorrect: true },
        { label: 'C', content: 'Gross Margin Percentage', isCorrect: false },
        { label: 'D', content: 'Net Churn Rate', isCorrect: false },
      ],
    },
    {
      prompt: 'What is a Minimum Viable Product (MVP) designed to achieve according to Eric Ries?',
      points: 1,
      explanation: 'An MVP is the version of a new product which allows a team to collect the maximum amount of validated learning about customers with the least effort.',
      options: [
        { label: 'A', content: 'The cheapest production item sold at discount', isCorrect: false },
        { label: 'B', content: 'The fastest vehicle to maximize validated learning with minimal development effort', isCorrect: true },
        { label: 'C', content: 'A complete feature-rich application ready for enterprise IPO', isCorrect: false },
        { label: 'D', content: 'A throwaway prototype discarded without user interaction', isCorrect: false },
      ],
    },
    {
      prompt: 'What term describes financing a startup solely through personal savings, sweat equity, and operating cash flows without external venture capital?',
      points: 1,
      explanation: 'Bootstrapping refers to building and scaling a company using self-funding and customer revenues.',
      options: [
        { label: 'A', content: 'Crowdfunding', isCorrect: false },
        { label: 'B', content: 'Bootstrapping', isCorrect: true },
        { label: 'C', content: 'Series A syndication', isCorrect: false },
        { label: 'D', content: 'Angel incubation', isCorrect: false },
      ],
    },
    {
      prompt: 'In market sizing calculations, what does SAM represent?',
      points: 1,
      explanation: 'SAM stands for Serviceable Available Market (or Serviceable Addressable Market), the segment of the Total Addressable Market (TAM) targeted by your products.',
      options: [
        { label: 'A', content: 'Sales and Marketing Allocation', isCorrect: false },
        { label: 'B', content: 'Serviceable Addressable Market', isCorrect: true },
        { label: 'C', content: 'Secondary Asset Management', isCorrect: false },
        { label: 'D', content: 'Systematic Acquisition Metric', isCorrect: false },
      ],
    },
    {
      prompt: 'What legal instrument protects inventions, technological processes, and functional apparatus from unauthorized replication?',
      points: 1,
      explanation: 'Patents grant exclusive territorial rights to manufacture, use, or sell a novel, non-obvious, and industrially applicable invention for a statutory period (typically 20 years).',
      options: [
        { label: 'A', content: 'Trademark', isCorrect: false },
        { label: 'B', content: 'Patent', isCorrect: true },
        { label: 'C', content: 'Copyright', isCorrect: false },
        { label: 'D', content: 'Trade Secret Agreement', isCorrect: false },
      ],
    },
    {
      prompt: 'What does a startup "Pivot" represent in the Build-Measure-Learn feedback loop?',
      points: 1,
      explanation: 'A pivot is a structured course correction designed to test a new fundamental hypothesis about the product, business model, or engine of growth while keeping one foot anchored.',
      options: [
        { label: 'A', content: 'Shutting down operations and liquidating company assets', isCorrect: false },
        { label: 'B', content: 'A structured course correction testing a new strategic hypothesis', isCorrect: true },
        { label: 'C', content: 'Selling majority stake to an institutional investor', isCorrect: false },
        { label: 'D', content: 'Terminating the core technical team', isCorrect: false },
      ],
    },
    {
      prompt: 'What ratio between Customer Lifetime Value (LTV) and Customer Acquisition Cost (CAC) is conventionally targeted for a sustainable SaaS business model?',
      points: 1,
      explanation: 'An LTV:CAC ratio of 3:1 or higher is the benchmark for healthy unit economics in venture-scale software businesses.',
      options: [
        { label: 'A', content: '1:1', isCorrect: false },
        { label: 'B', content: '3:1 or higher', isCorrect: true },
        { label: 'C', content: '0.5:1', isCorrect: false },
        { label: 'D', content: '1:10', isCorrect: false },
      ],
    },
    {
      prompt: 'What is Burn Rate in startup financial management?',
      points: 1,
      explanation: 'Burn rate is the rate at which a startup spends its cash reserves before reaching positive cash flow (Net Burn = Monthly Outflows - Monthly Revenues).',
      options: [
        { label: 'A', content: 'Server CPU utilization under peak traffic', isCorrect: false },
        { label: 'B', content: 'The monthly net cash outflow depleting company capital', isCorrect: true },
        { label: 'C', content: 'The attrition percentage of early employees', isCorrect: false },
        { label: 'D', content: 'Annual dividend distributed to preferred shareholders', isCorrect: false },
      ],
    },
    {
      prompt: 'Which type of intellectual property protects logos, brand names, and slogans distinguishing goods and services in commerce?',
      points: 1,
      explanation: 'A Trademark protects brand identifiers such as names, logos, and symbols that designate the commercial source of goods.',
      options: [
        { label: 'A', content: 'Patent', isCorrect: false },
        { label: 'B', content: 'Trademark', isCorrect: true },
        { label: 'C', content: 'Industrial Design', isCorrect: false },
        { label: 'D', content: 'Geographical Indication', isCorrect: false },
      ],
    },
  ],

  SEC203: [
    {
      prompt: 'If an item is purchased for Rs 400 and sold for Rs 500, what is the profit percentage earned on the cost price?',
      points: 1,
      explanation: 'Profit = Selling Price - Cost Price = 500 - 400 = 100. Profit % = (100 / 400) * 100 = 25%.',
      options: [
        { label: 'A', content: '20%', isCorrect: false },
        { label: 'B', content: '25%', isCorrect: true },
        { label: 'C', content: '30%', isCorrect: false },
        { label: 'D', content: '15%', isCorrect: false },
      ],
    },
    {
      prompt: 'A can complete a piece of work in 12 days, and B can complete the same work in 24 days. Working together, in how many days can they finish the work?',
      points: 1,
      explanation: 'Combined rate = 1/12 + 1/24 = (2 + 1) / 24 = 3/24 = 1/8 work per day. Total time = 8 days.',
      options: [
        { label: 'A', content: '6 days', isCorrect: false },
        { label: 'B', content: '8 days', isCorrect: true },
        { label: 'C', content: '10 days', isCorrect: false },
        { label: 'D', content: '18 days', isCorrect: false },
      ],
    },
    {
      prompt: 'A train 180 meters long travels at a uniform speed of 54 km/h. How many seconds will it take to cross a stationary signal pole?',
      points: 1,
      explanation: 'Speed in m/s = 54 * (5/18) = 15 m/s. Time = Distance / Speed = 180 / 15 = 12 seconds.',
      options: [
        { label: 'A', content: '10 seconds', isCorrect: false },
        { label: 'B', content: '12 seconds', isCorrect: true },
        { label: 'C', content: '15 seconds', isCorrect: false },
        { label: 'D', content: '18 seconds', isCorrect: false },
      ],
    },
    {
      prompt: 'The ratio of ages of father and son is 7:3. If the sum of their ages is 60 years, what is the son\'s current age?',
      points: 1,
      explanation: 'Total parts = 7 + 3 = 10. Value of 1 part = 60 / 10 = 6 years. Son\'s age = 3 * 6 = 18 years.',
      options: [
        { label: 'A', content: '14 years', isCorrect: false },
        { label: 'B', content: '18 years', isCorrect: true },
        { label: 'C', content: '21 years', isCorrect: false },
        { label: 'D', content: '24 years', isCorrect: false },
      ],
    },
    {
      prompt: 'What is the compound interest on a principal of Rs 10,000 for 2 years at an annual interest rate of 10% compounded annually?',
      points: 1,
      explanation: 'Amount = P * (1 + r/100)^t = 10000 * (1.10)^2 = 10000 * 1.21 = Rs 12,100. CI = 12,100 - 10,000 = Rs 2,100.',
      options: [
        { label: 'A', content: 'Rs 2,000', isCorrect: false },
        { label: 'B', content: 'Rs 2,100', isCorrect: true },
        { label: 'C', content: 'Rs 2,200', isCorrect: false },
        { label: 'D', content: 'Rs 1,900', isCorrect: false },
      ],
    },
    {
      prompt: 'In how many different ways can the letters of the word "ENGINE" be arranged?',
      points: 1,
      explanation: '"ENGINE" has 6 letters with E repeated 2 times and N repeated 2 times. Total permutations = 6! / (2! * 2!) = 720 / 4 = 180.',
      options: [
        { label: 'A', content: '720', isCorrect: false },
        { label: 'B', content: '180', isCorrect: true },
        { label: 'C', content: '360', isCorrect: false },
        { label: 'D', content: '90', isCorrect: false },
      ],
    },
    {
      prompt: 'Two fair six-sided dice are rolled simultaneously. What is the probability that the sum of the numbers shown on top is equal to 8?',
      points: 1,
      explanation: 'Pairs summing to 8: (2,6), (3,5), (4,4), (5,3), (6,2) -> 5 outcomes out of 36 total. Probability = 5/36.',
      options: [
        { label: 'A', content: '1/6', isCorrect: false },
        { label: 'B', content: '5/36', isCorrect: true },
        { label: 'C', content: '7/36', isCorrect: false },
        { label: 'D', content: '1/9', isCorrect: false },
      ],
    },
    {
      prompt: 'Find the next term in the logical number series: 2, 6, 12, 20, 30, ?',
      points: 1,
      explanation: 'Differences: +4, +6, +8, +10. Next difference is +12. 30 + 12 = 42 (also n^2 + n: 1*2, 2*3, 3*4, 4*5, 5*6, 6*7 = 42).',
      options: [
        { label: 'A', content: '40', isCorrect: false },
        { label: 'B', content: '42', isCorrect: true },
        { label: 'C', content: '44', isCorrect: false },
        { label: 'D', content: '48', isCorrect: false },
      ],
    },
    {
      prompt: 'Pointing to a photograph of a woman, Rajesh said, "Her mother\'s only daughter is my wife." How is the woman in the photograph related to Rajesh?',
      points: 1,
      explanation: '"Her mother\'s only daughter" is the woman herself. Rajesh says she is his wife. Thus, the woman is Rajesh\'s wife.',
      options: [
        { label: 'A', content: 'Sister', isCorrect: false },
        { label: 'B', content: 'Wife', isCorrect: true },
        { label: 'C', content: 'Mother', isCorrect: false },
        { label: 'D', content: 'Daughter', isCorrect: false },
      ],
    },
    {
      prompt: 'If "LOGIC" is encoded in a cipher as "MQHJD" (each letter shifted forward by +1), what is the cipher encoding for "SMART"?',
      points: 1,
      explanation: 'S(+1)->T, M(+1)->N, A(+1)->B, R(+1)->S, T(+1)->U = TNBSU.',
      options: [
        { label: 'A', content: 'TNBSU', isCorrect: true },
        { label: 'B', content: 'TLZQS', isCorrect: false },
        { label: 'C', content: 'TOCTU', isCorrect: false },
        { label: 'D', content: 'UNCTV', isCorrect: false },
      ],
    },
  ],
};

// ============================================================================
// 2. MID-SEMESTER WRITTEN QUESTIONS (7 questions per course x 7 = 49 questions)
// Pattern: "Answer any 5 out of 7 questions" (10 marks each, Total 50 marks, 90 mins)
// ============================================================================

export const MIDSEM_WRITTEN_BANK: Record<string, WrittenQuestionSpec[]> = {
  CSE202: [
    {
      prompt: 'Define Encapsulation and Data Hiding in C++. Provide a complete C++ class implementation demonstrating private member variables, public getter and setter methods with boundary validation, and explain how access control protects object invariants.',
      points: 10,
      rubric: '3 marks for precise conceptual definitions; 4 marks for complete valid C++ class code with private variables and setters; 3 marks for boundary validation and explanation of invariant protection.',
      solutionOutline: 'Class with private data, public accessors enforcing invariant checks (e.g., balance >= 0), constructor initialization list.',
    },
    {
      prompt: 'Explain the need for Copy Constructors in C++. Contrast Shallow Copy versus Deep Copy with a concrete code example where a class manages dynamically allocated heap memory using raw pointers, illustrating why a custom copy constructor and destructor are required to avoid double-free errors.',
      points: 10,
      rubric: '3 marks for copy constructor syntax and invocation scenarios; 4 marks for deep copy vs shallow copy code demonstration with pointer allocation; 3 marks for explaining double-free and memory corruption risks.',
      solutionOutline: 'Class String or Array with char* / int* heap buffer, copy constructor allocating new buffer and copying contents.',
    },
    {
      prompt: 'What are Friend Functions and Friend Classes in C++? Discuss the circumstances under which friendship is preferred over public accessors, and explain whether friendship is inherited, transitive, or reciprocal, supporting your answer with code.',
      points: 10,
      rubric: '3 marks for defining friend declarations; 4 marks for C++ code example demonstrating friend function accessing private fields; 3 marks for explaining that friendship is not mutual, transitive, or inherited.',
      solutionOutline: 'Operator overloading for stream insertion (operator<<) as friend function.',
    },
    {
      prompt: 'Discuss Operator Overloading in C++. Write a complete C++ program to overload the addition operator (+) and the stream insertion operator (<<) for a ComplexNumber class representing complex numbers with real and imaginary parts.',
      points: 10,
      rubric: '3 marks for operator overloading syntax rules; 4 marks for member/non-member implementation of operator+; 3 marks for friend operator<< implementation with std::ostream.',
      solutionOutline: 'ComplexNumber operator+(const ComplexNumber&) const; friend ostream& operator<<(ostream&, const ComplexNumber&).',
    },
    {
      prompt: 'Describe the differences between Compile-Time Polymorphism (Static Binding) and Run-Time Polymorphism (Dynamic Binding) in C++. Explain how Virtual Functions and Virtual Method Tables (V-Tables) enable dynamic dispatch at runtime.',
      points: 10,
      rubric: '3 marks for static vs dynamic polymorphism comparison table; 4 marks for code showing virtual method override and base pointer invocation; 3 marks for technical explanation of vptr and vtable layout.',
      solutionOutline: 'Base class with virtual void draw(), Derived classes Circle/Rectangle, vptr pointing to class vtable.',
    },
    {
      prompt: 'Explain Multiple Inheritance in C++ and the Dreaded Diamond Problem. Illustrate how Virtual Base Classes solve ambiguous duplicate sub-objects using a complete class hierarchy diagram and C++ code implementation.',
      points: 10,
      rubric: '3 marks for explaining multiple inheritance ambiguity; 4 marks for virtual base class syntax (class B : virtual public A); 3 marks for code example compiling without scope resolution ambiguity.',
      solutionOutline: 'A -> (virtual B, virtual C) -> D hierarchy with single instance of A in D.',
    },
    {
      prompt: 'What are Pure Virtual Functions and Abstract Classes in C++? Design an abstract base class Shape with pure virtual functions calculateArea() and calculatePerimeter(), and implement concrete derived classes Rectangle and Circle.',
      points: 10,
      rubric: '3 marks for pure virtual syntax (= 0) and abstract class properties; 4 marks for Shape abstract class; 3 marks for correct mathematical area and perimeter calculations in derived classes.',
      solutionOutline: 'class Shape { virtual double calculateArea() const = 0; }; class Rectangle : public Shape { ... };',
    },
  ],

  CSE203: [
    {
      prompt: 'State and prove the principle of Mathematical Induction. Use mathematical induction to prove that for all positive integers n >= 1: 1^2 + 2^2 + 3^2 + ... + n^2 = (n * (n + 1) * (2n + 1)) / 6.',
      points: 10,
      rubric: '2 marks for stating induction hypothesis and basis step; 3 marks for base case verification (n=1); 5 marks for rigorous inductive step P(k) -> P(k+1) with algebraic simplification.',
      solutionOutline: 'Base case n=1 gives 1 = 1(2)(3)/6 = 1. Assume true for k, add (k+1)^2, factor out (k+1) to reach (k+1)(k+2)(2k+3)/6.',
    },
    {
      prompt: 'Construct the truth table for the compound logical proposition ((P -> Q) ^ (Q -> R)) -> (P -> R). Determine whether this statement is a Tautology, Contradiction, or Contingency, and identify which classical rule of inference this represents.',
      points: 10,
      rubric: '5 marks for accurate 8-row truth table with all intermediate columns; 3 marks for proving all outputs are True (Tautology); 2 marks for naming Hypothetical Syllogism.',
      solutionOutline: 'Table with 8 rows for P, Q, R, P->Q, Q->R, (P->Q)^(Q->R), P->R, final implication column all T.',
    },
    {
      prompt: 'Let A = {1, 2, 3, 4}. Define a relation R on A as R = {(a, b) : a = b (mod 2)}. Prove rigorously that R is an Equivalence Relation. Determine the equivalence classes [1] and [2] generated by this relation.',
      points: 10,
      rubric: '3 marks for proving Reflexivity and Symmetry; 3 marks for proving Transitivity; 4 marks for identifying equivalence classes [1]={1,3} (odd) and [2]={2,4} (even) partitioning A.',
      solutionOutline: 'a - a = 0 (even), a - b even -> b - a even, (a-b)+(b-c) even -> a-c even. Classes [1]={1,3}, [2]={2,4}.',
    },
    {
      prompt: 'Explain the Pigeonhole Principle and its Generalized form. A bag contains 15 red balls, 18 blue balls, and 20 green balls. What is the minimum number of balls that must be drawn at random without replacement to guarantee that at least 8 balls of the same color are chosen?',
      points: 10,
      rubric: '3 marks for stating principle and generalized formula ceil(N/k); 4 marks for worst-case analysis (7 of each color = 21 balls); 3 marks for final answer 21 + 1 = 22 balls.',
      solutionOutline: 'Worst case: 7 red + 7 blue + 7 green = 21 balls. The 22nd ball must make 8 of one color.',
    },
    {
      prompt: 'State the Handshaking Theorem for undirected graphs. Prove that in any undirected graph, the number of vertices with odd degree is always even. Provide an example graph with 5 vertices verifying this property.',
      points: 10,
      rubric: '3 marks for stating sum(deg(v)) = 2|E|; 4 marks for algebraic proof separating vertices into V_even and V_odd; 3 marks for concrete 5-vertex graph example.',
      solutionOutline: 'sum(deg(v)) = sum_even + sum_odd = 2|E|. Since 2|E| is even and sum_even is even, sum_odd must be even, so |V_odd| is even.',
    },
    {
      prompt: 'Define a Poset (Partially Ordered Set) and a Lattice. Draw the Hasse Diagram for the poset (D_36, |), where D_36 is the set of all positive divisors of 36 ordered by divisibility. Determine the maximal, minimal, greatest, and least elements.',
      points: 10,
      rubric: '3 marks for definitions of Poset and Lattice; 4 marks for correct Hasse diagram with levels 1, {2,3}, {4,6,9}, {12,18}, 36; 3 marks for identifying least=1, greatest=36.',
      solutionOutline: 'Divisors {1, 2, 3, 4, 6, 9, 12, 18, 36}. Distinct directed upward graph without redundant transitive edges.',
    },
    {
      prompt: 'Solve the linear homogeneous recurrence relation with constant coefficients: a_n = 5a_{n-1} - 6a_{n-2} for n >= 2, given the initial conditions a_0 = 1 and a_1 = 4.',
      points: 10,
      rubric: '3 marks for characteristic equation r^2 - 5r + 6 = 0 and roots r=2, r=3; 4 marks for general solution a_n = c_1(2^n) + c_2(3^n); 3 marks for solving constants c_1=-1, c_2=2, giving a_n = 2*(3^n) - 2^n.',
      solutionOutline: '(r-2)(r-3)=0 -> r1=2, r2=3. c1+c2=1, 2c1+3c2=4 -> c2=2, c1=-1. a_n = 2(3^n) - 2^n.',
    },
  ],

  CSE204: [
    {
      prompt: 'State the Master Theorem for divide-and-conquer recurrences of the form T(n) = aT(n/b) + f(n). Explain all three cases with conditions, and apply it to solve: (a) T(n) = 4T(n/2) + n, (b) T(n) = 2T(n/2) + n log n.',
      points: 10,
      rubric: '4 marks for defining a >= 1, b > 1 and the 3 Master Theorem cases; 3 marks for part (a) showing Case 1 Theta(n^2); 3 marks for part (b) showing extended Case 2 Theta(n log^2 n).',
      solutionOutline: 'log_b(a) = log_2(4) = 2. f(n) = n = O(n^{2 - eps}) -> Case 1 -> Theta(n^2). For (b), f(n) = n log n -> Theta(n log^2 n).',
    },
    {
      prompt: 'Describe the Quicksort algorithm. Write the Lomuto or Hoare partitioning procedure in pseudocode, trace it on array A = [28, 12, 45, 19, 33, 10, 22], and analyze its worst-case and average-case time complexities.',
      points: 10,
      rubric: '3 marks for partition pseudocode; 4 marks for step-by-step trace showing pivot element placement; 3 marks for worst-case O(n^2) and average-case O(n log n) analysis.',
      solutionOutline: 'Partition selects pivot, scans with i and j indices, swaps elements <= pivot, places pivot in correct final position.',
    },
    {
      prompt: 'Explain the Min-Heap data structure and its array representation. Show the step-by-step construction of a Min-Heap from array [16, 14, 10, 8, 7, 9, 3, 2, 4, 1] using Floyd\'s bottom-up build-heap algorithm, and analyze why building a heap takes O(n) time.',
      points: 10,
      rubric: '3 marks for array indexing (parent=i/2, left=2i, right=2i+1); 4 marks for heapify traces from index n/2 down to 1; 3 marks for mathematical proof of O(n) time using sum of heights.',
      solutionOutline: 'Start heapify at index 5 down to 1. Sum (h / 2^h) series sums to 2, yielding O(n) total time.',
    },
    {
      prompt: 'Explain Dijkstra\'s algorithm for finding single-source shortest paths in a directed weighted graph with non-negative edge weights. Provide pseudocode using a Priority Queue, and trace the algorithm on a 5-vertex graph from source vertex S.',
      points: 10,
      rubric: '4 marks for pseudocode with dist[], prev[], and min-priority queue; 4 marks for trace table tracking vertex extraction and edge relaxations; 2 marks for O((V + E) log V) complexity derivation.',
      solutionOutline: 'dist[s]=0, dist[v]=inf. While Q not empty: u = extractMin(Q); for each neighbor v: if dist[u]+w(u,v) < dist[v] relax.',
    },
    {
      prompt: 'Compare Prim\'s and Kruskal\'s algorithms for Minimum Spanning Trees (MST). Describe the Disjoint Set Union (DSU) data structure with Union by Rank and Path Compression, and show how Kruskal\'s algorithm utilizes DSU to detect cycles.',
      points: 10,
      rubric: '3 marks for Prim vs Kruskal comparison (vertex-growing vs edge-sorting); 4 marks for DSU find() with path compression and union() with rank; 3 marks for cycle detection mechanism.',
      solutionOutline: 'Sort edges by weight. If find(u) != find(v), add edge and union(u, v); if find(u) == find(v), reject edge to prevent cycle.',
    },
    {
      prompt: 'Formulate the 0/1 Knapsack problem using Dynamic Programming. Given capacity W = 7 and items with weights [1, 3, 4, 5] and values [1, 4, 5, 7], construct the full DP table, find the maximum attainable value, and backtrack to identify the selected items.',
      points: 10,
      rubric: '3 marks for recurrence V[i, w] = max(V[i-1, w], V[i-1, w-w_i] + v_i); 4 marks for completed 5x8 DP table; 3 marks for maximum value calculation and backtracking to items.',
      solutionOutline: 'Fill DP matrix table. Max value at V[4, 7] = 9. Backtrack: selected items 2 (w=3, v=4) and 4 (w=5, v=7) or equivalent.',
    },
    {
      prompt: 'Explain the Longest Common Subsequence (LCS) problem. State the dynamic programming recurrence relation, construct the DP matrix for sequences X = "ABCBDAB" and Y = "BDCABA", determine the length of the LCS, and extract all possible LCS strings.',
      points: 10,
      rubric: '3 marks for LCS recurrence; 4 marks for filled (m+1)x(n+1) matrix with directional arrows; 3 marks for length = 4 and strings "BCBA", "BDAB", "BCAB".',
      solutionOutline: 'LCS recurrence: if X[i]==Y[j] L[i,j]=1+L[i-1,j-1], else max(L[i-1,j], L[i,j-1]). Backtrack for solutions.',
    },
  ],

  CSE207: [
    {
      prompt: 'State and prove the basic theorems of Boolean algebra: (a) Duality Principle, (b) Idempotent Laws, and (c) De Morgan\'s Laws. Simplify the Boolean function F(A, B, C, D) = sum m(0, 2, 8, 9, 10, 11, 14, 15) using a 4-variable Karnaugh Map.',
      points: 10,
      rubric: '3 marks for stating Boolean theorems and algebraic proofs; 4 marks for K-map grid plotting with Gray code labeling; 3 marks for prime implicant grouping and minimal SOP expression.',
      solutionOutline: 'Group minterms into quads and pairs. Minimal SOP: F = B\'D\' + AB\' + AC.',
    },
    {
      prompt: 'Design a Full Adder circuit using only 2-input NAND gates. Derive the Boolean equations for Sum and Carry from the truth table, show the intermediate gate transformations, and draw the complete logic gate schematic.',
      points: 10,
      rubric: '3 marks for truth table and standard SOP equations (Sum = A ^ B ^ Cin, Carry = AB + Cin(A ^ B)); 4 marks for NAND-only implementation algebra; 3 marks for clean logic diagram using 9 NAND gates.',
      solutionOutline: 'Half adder with 5 NANDs, cascade two half adders and combine carries with one NAND gate (total 9 NAND gates).',
    },
    {
      prompt: 'Design a 4-to-2 Binary Priority Encoder where higher numbered inputs have higher priority. Construct the complete truth table including don\'t care conditions, derive the simplified Boolean expressions for outputs Y1, Y0 and valid bit V, and draw the logic diagram.',
      points: 10,
      rubric: '3 marks for truth table with don\'t-cares (D3 has priority over D2, D1, D0); 4 marks for K-map simplification for Y1, Y0 and V = D3 + D2 + D1 + D0; 3 marks for logic schematic.',
      solutionOutline: 'Y1 = D3 + D2; Y0 = D3 + D2\'D1; V = D3 + D2 + D1 + D0.',
    },
    {
      prompt: 'Explain the working of an S-R Latch using NOR gates. What is the invalid state, and how does the J-K Flip-Flop eliminate this condition? Draw the circuit diagram of an edge-triggered Master-Slave J-K Flip-Flop and explain how it prevents race-around.',
      points: 10,
      rubric: '3 marks for NOR S-R latch truth table and invalid S=1,R=1 explanation; 3 marks for J-K feedback elimination of forbidden state; 4 marks for master-slave diagram and two-phase clocking avoiding race-around.',
      solutionOutline: 'Master triggered on clock HIGH, Slave triggered on clock LOW, isolating inputs during transition.',
    },
    {
      prompt: 'Design a 3-bit Synchronous Binary Up-Counter using J-K Flip-Flops. Present the state transition table, excitation table for J-K flip-flops, K-maps for J and K inputs of each flip-flop, and draw the complete logic diagram with a common clock.',
      points: 10,
      rubric: '3 marks for state diagram and excitation table; 4 marks for K-maps deriving J0=K0=1, J1=K1=Q0, J2=K2=Q0*Q1; 3 marks for synchronized schematic diagram.',
      solutionOutline: 'Count 000 to 111. FF0 toggles every clock; FF1 toggles when Q0=1; FF2 toggles when Q0*Q1=1.',
    },
    {
      prompt: 'Explain the operation of a 4-bit Universal Shift Register. Describe its modes of operation: Parallel Load, Shift Right, Shift Left, and Hold. Draw the internal architecture showing the 4-to-1 multiplexers and D flip-flops.',
      points: 10,
      rubric: '3 marks for mode control table using select lines S1, S0; 4 marks for internal diagram with 4:1 MUX and D flip-flops; 3 marks for signal propagation tracing in each mode.',
      solutionOutline: 'S1S0 = 00 (Hold), 01 (Shift Right), 10 (Shift Left), 11 (Parallel Load). 4 MUXes select input for each D flip-flop.',
    },
    {
      prompt: 'Design an 8-to-1 Multiplexer using two 4-to-1 Multiplexers and one 2-to-1 Multiplexer (or logic gates). Provide the block diagram, truth table, and explain how the select lines S2, S1, S0 route the corresponding input to the output.',
      points: 10,
      rubric: '3 marks for multiplexer hierarchy theory; 4 marks for architectural block diagram connecting I0-I3 to MUX1 and I4-I7 to MUX2; 3 marks for S2 controlling the final 2:1 MUX.',
      solutionOutline: 'S1 and S0 connected to both 4:1 MUXes. S2 acts as select line for 2:1 MUX choosing between MUX1 and MUX2 outputs.',
    },
  ],

  CSE213: [
    {
      prompt: 'Explain the Java Memory Model (JMM), detailing the roles of Heap, Stack, Metaspace, and PC Registers. Discuss how Java Garbage Collection works, contrasting the Mark-and-Sweep, Generational (Young vs Old Generation), and G1 collectors.',
      points: 10,
      rubric: '4 marks for architectural explanation of memory areas; 3 marks for generational hypothesis (Eden, Survivor S0/S1, Tenured); 3 marks for G1 region-based collection and pause time goals.',
      solutionOutline: 'Diagram showing Stack frames, Heap Young/Old gen, Metaspace native allocation, and GC lifecycle.',
    },
    {
      prompt: 'Analyze Java Exception Handling architecture. Contrast Checked Exceptions, Unchecked (Runtime) Exceptions, and Errors with inheritance hierarchy. Write a comprehensive program demonstrating try-with-resources with a custom AutoCloseable class, catch blocks with multi-catch, and finally block semantics.',
      points: 10,
      rubric: '3 marks for Throwable hierarchy breakdown; 4 marks for custom AutoCloseable resource management; 3 marks for multi-catch syntax and finally execution guarantees.',
      solutionOutline: 'Throwable -> (Error, Exception -> RuntimeException). Custom DatabaseConnection implements AutoCloseable.',
    },
    {
      prompt: 'Examine the Java Collections Framework. Compare ArrayList versus LinkedList, and HashMap versus TreeMap in terms of underlying data structure, Big-O time complexity for operations (insert, delete, search), and memory overhead. Explain HashMap collision resolution in Java 8+ (buckets converting to Red-Black trees).',
      points: 10,
      rubric: '4 marks for comparative analysis tables with Big-O notations; 3 marks for internal array growth and pointer overhead; 3 marks for HashMap treeify threshold (8 entries) to O(log n) tree.',
      solutionOutline: 'ArrayList dynamic array O(1) amortized vs LinkedList O(1) ends. HashMap buckets with LinkedList converting to TreeNode at threshold 8.',
    },
    {
      prompt: 'Describe Java Multithreading and Synchronization. Explain the difference between implementing Runnable versus extending Thread versus using Callable and Future. Write a thread-safe Singleton class using Double-Checked Locking with volatile keyword, explaining why volatile is mandatory.',
      points: 10,
      rubric: '3 marks for thread creation comparisons; 4 marks for Double-Checked Locking Singleton code; 3 marks for explaining instruction reordering (partially constructed object) and volatile fix.',
      solutionOutline: 'private static volatile Singleton instance; synchronized(Singleton.class) check instance == null twice.',
    },
    {
      prompt: 'Explain the Java 8 Streams API. Differentiate between Intermediate and Terminal operations with examples. Write a complete Java program that processes a list of Employee objects (id, name, department, salary) to: (a) filter employees earning > 50,000, (b) group them by department, and (c) calculate average salary per department using Collectors.',
      points: 10,
      rubric: '3 marks for Stream pipeline mechanics (lazy evaluation); 4 marks for complete Java stream pipeline with groupingBy and averagingDouble; 3 marks for correct output handling.',
      solutionOutline: 'employees.stream().filter(e -> e.getSalary() > 50000).collect(Collectors.groupingBy(Employee::getDepartment, Collectors.averagingDouble(Employee::getSalary))).',
    },
    {
      prompt: 'What are Java Generics and Type Erasure? Explain bounded type parameters (<T extends Comparable<T>>) and wildcards (? extends Number vs ? super Integer - PECS rule). Write a generic method that finds the maximum element in a slice of an array of any comparable type.',
      points: 10,
      rubric: '3 marks for Generics motivation and bytecode type erasure; 3 marks for PECS (Producer Extends, Consumer Super) explanation; 4 marks for generic max method with T extends Comparable<T>.',
      solutionOutline: 'public static <T extends Comparable<T>> T findMax(T[] array) { ... }',
    },
    {
      prompt: 'Describe the complete JDBC architecture. Explain the roles of DriverManager, Connection, PreparedStatement, and ResultSet. Write a production-grade JDBC code snippet executing a transaction that transfers funds between two bank accounts with setAutoCommit(false), commit(), and rollback() in catch block.',
      points: 10,
      rubric: '3 marks for JDBC component explanations; 4 marks for parameterized PreparedStatement usage preventing SQL injection; 3 marks for explicit transaction management with commit and rollback.',
      solutionOutline: 'con.setAutoCommit(false); debit.executeUpdate(); credit.executeUpdate(); con.commit(); catch -> con.rollback().',
    },
  ],

  ENT243: [
    {
      prompt: 'Explain the Lean Startup methodology pioneered by Eric Ries. Compare the traditional plan-first corporate approach with the Build-Measure-Learn feedback loop. Discuss how hypothesis testing and Validated Learning minimize the risk of catastrophic startup failure.',
      points: 10,
      rubric: '3 marks for contrasting traditional vs lean methodologies; 4 marks for the Build-Measure-Learn cycle and MVP role; 3 marks for explaining validated learning metrics vs vanity metrics.',
      solutionOutline: 'Customer discovery -> MVP -> Measure user behavior -> Learn -> Pivot or Persevere loop.',
    },
    {
      prompt: 'Describe the 9 blocks of the Lean Canvas (Problem, Solution, Key Metrics, Unique Value Proposition, Unfair Advantage, Channels, Customer Segments, Cost Structure, Revenue Streams). Create a comprehensive Lean Canvas for an innovative EdTech examination integrity platform.',
      points: 10,
      rubric: '3 marks for explaining the 9 components; 5 marks for applying all 9 blocks to an EdTech proctoring solution; 2 marks for defining actionable UVP and defensible Unfair Advantage.',
      solutionOutline: 'Fill all 9 blocks tailored to university assessment security, WASM edge analysis, and student privacy.',
    },
    {
      prompt: 'Explain Customer Discovery and the "Mom Test" principles for conducting unbiased customer interviews. How can an entrepreneur differentiate between a customer\'s genuine willingness to pay versus polite compliments? Provide a sample script of 5 diagnostic interview questions.',
      points: 10,
      rubric: '3 marks for Mom Test rules (talk about their life, don\'t pitch ideas, ask about past behavior); 4 marks for 5 diagnostic non-leading questions; 3 marks for techniques identifying real commitments.',
      solutionOutline: 'Ask about current workarounds, budget authority, last time they encountered the problem, and ask for skin-in-the-game commitment.',
    },
    {
      prompt: 'Define and formulate the critical SaaS unit economic metrics: Customer Acquisition Cost (CAC), Customer Lifetime Value (LTV), Monthly Recurring Revenue (MRR), and Churn Rate. A B2B startup spends Rs 3,00,000 on marketing to acquire 30 institutional clients who pay Rs 25,000 monthly with 2% monthly churn. Calculate CAC, LTV, and LTV:CAC ratio, and evaluate health.',
      points: 10,
      rubric: '4 marks for metric definitions and formulas; 4 marks for calculations (CAC = 10,000; Avg Lifetime = 1/0.02 = 50 months; LTV = 50 * 25,000 = 12,50,000; LTV/CAC = 125x); 2 marks for economic health evaluation.',
      solutionOutline: 'CAC = 300000/30 = 10000. Churn = 0.02 -> Lifetime = 50 months. LTV = 1250000. LTV:CAC is exceptionally strong.',
    },
    {
      prompt: 'Analyze Startup Financing stages from Seed to Series A/B and Beyond. Differentiate between Bootstrapping, Angel Investors, Venture Capitalists (VC), and Debt Financing. Discuss the trade-offs between equity dilution and strategic acceleration.',
      points: 10,
      rubric: '3 marks for funding round progression; 4 marks for comparing Angel vs VC expectations, governance, and return horizons; 3 marks for dilution trade-offs and founder control.',
      solutionOutline: 'Bootstrapping (100% control, slow growth) vs VC (dilution, board seats, 10x return mandate, hypergrowth).',
    },
    {
      prompt: 'What constitutes a defensible "Moat" or Unfair Advantage according to venture frameworks? Detail the four primary types of moats: Network Effects, Switching Costs, Cost Advantages, and Intangible Assets (Patents, Brand). Illustrate each with a real-world tech company.',
      points: 10,
      rubric: '3 marks for definition of defensible moat; 4 marks for the 4 moat categories with clear mechanisms; 3 marks for authentic industry examples (e.g., Airbnb, AWS, Visa, Apple).',
      solutionOutline: 'Network effects (2-sided marketplaces), High switching costs (ERP/LMS), Cost advantages (economies of scale), Intangible assets (patents, regulatory licenses).',
    },
    {
      prompt: 'Explain the four pillars of Intellectual Property (IP): Patents, Trademarks, Copyrights, and Trade Secrets. If a student startup develops a novel machine learning algorithm embedded in hardware for proctoring, outline an IP protection strategy for their code, hardware design, brand name, and proprietary weights.',
      points: 10,
      rubric: '3 marks for defining the 4 IP categories; 4 marks for allocating specific IP mechanisms to code (copyright), hardware (patent), brand (trademark), and weights (trade secret); 3 marks for international protection guidelines.',
      solutionOutline: 'Patent for novel physical device architecture; Trade secret for ML weights and training pipeline; Copyright for frontend/backend source; Trademark for brand/logo.',
    },
  ],

  SEC203: [
    {
      prompt: 'A retailer buys two items for Rs 1200 and Rs 1600 respectively. He sells the first item at a profit of 15% and the second item at a loss of 10%. Calculate the overall profit or loss amount and the overall net profit or loss percentage for the entire transaction.',
      points: 10,
      rubric: '3 marks for calculating SP of item 1 (1200 * 1.15 = 1380); 3 marks for calculating SP of item 2 (1600 * 0.90 = 1440); 4 marks for Total CP = 2800, Total SP = 2820, Net Profit = Rs 20, Profit % = (20/2800)*100 = 0.714%.',
      solutionOutline: 'SP1 = 1380, SP2 = 1440. Total SP = 2820. Total CP = 2800. Net Profit = Rs 20. Net % = 0.714%.',
    },
    {
      prompt: 'Pipe A can fill a tank in 16 hours, and Pipe B can fill it in 24 hours. A waste Pipe C can empty the full tank in 48 hours. If all three pipes are opened together when the tank is empty, calculate the exact time (in hours and minutes) required to fill the tank completely.',
      points: 10,
      rubric: '3 marks for establishing net filling rate per hour: 1/16 + 1/24 - 1/48; 4 marks for finding common denominator (48) -> (3 + 2 - 1)/48 = 4/48 = 1/12; 3 marks for concluding exactly 12 hours.',
      solutionOutline: 'Rate = 3/48 + 2/48 - 1/48 = 4/48 = 1/12 per hour. Total time = 12 hours.',
    },
    {
      prompt: 'Two trains of lengths 150 meters and 250 meters are running on parallel tracks. When running in opposite directions, they cross each other in 10 seconds. When running in the same direction, the faster train crosses the slower train in 40 seconds. Determine the speed of each train in kilometers per hour (km/h).',
      points: 10,
      rubric: '3 marks for total distance = 150 + 250 = 400 m; 3 marks for relative speeds: u + v = 400/10 = 40 m/s; u - v = 400/40 = 10 m/s; 4 marks for solving u = 25 m/s (90 km/h) and v = 15 m/s (54 km/h).',
      solutionOutline: 'u + v = 40, u - v = 10 -> 2u = 50 -> u = 25 m/s = 90 km/h; v = 15 m/s = 54 km/h.',
    },
    {
      prompt: 'A sum of money invested at compound interest doubles itself in 5 years. In how many years will it become 16 times its original value at the same rate of compound interest? Derive the formula and explain the mathematical principle applied.',
      points: 10,
      rubric: '4 marks for compound interest formula A = P(1 + r)^t and establishing (1 + r)^5 = 2; 4 marks for 16 = 2^4 = ((1 + r)^5)^4 = (1 + r)^20; 2 marks for concluding 20 years.',
      solutionOutline: 'P -> 2P in 5 yrs. 2P -> 4P in 10 yrs. 4P -> 8P in 15 yrs. 8P -> 16P in 20 yrs. Total 20 years.',
    },
    {
      prompt: 'A committee of 5 members is to be formed from a group of 6 men and 5 women. In how many ways can the committee be selected if: (a) it must contain exactly 3 men and 2 women, (b) it must contain at least 4 women, and (c) it must contain at least one man and at least one woman?',
      points: 10,
      rubric: '3 marks for part (a) C(6,3)*C(5,2) = 20 * 10 = 200; 3 marks for part (b) (4W, 1M) + (5W, 0M) = C(5,4)*C(6,1) + C(5,5)*C(6,0) = 5*6 + 1 = 31; 4 marks for part (c) Total C(11,5) - all men - all women = 462 - 6 - 1 = 455.',
      solutionOutline: '(a) 20 * 10 = 200. (b) 5*6 + 1 = 31. (c) Total C(11,5) = 462. Exclude all men C(6,5)=6 and all women C(5,5)=1. 462 - 7 = 455.',
    },
    {
      prompt: 'Evaluate the logical syllogism statements and conclusions using Venn Diagrams: Statements: (1) All engineers are innovators. (2) Some innovators are entrepreneurs. (3) No entrepreneur is risk-averse. Conclusions: (I) Some engineers are entrepreneurs. (II) Some innovators are not risk-averse. (III) All risk-averse individuals are non-innovators. Prove which conclusions logically follow.',
      points: 10,
      rubric: '3 marks for drawing 4 intersecting Venn circles; 3 marks for proving Conclusion I does not necessarily follow; 4 marks for proving Conclusion II definitely follows (innovators who are entrepreneurs are not risk-averse), Conclusion III is false.',
      solutionOutline: 'Venn diagram analysis. Conclusion II is valid. Conclusion I and III are invalid.',
    },
    {
      prompt: 'The percentage distribution of 1200 university candidates across 5 engineering branches is: CSE (35%), ECE (25%), MECH (15%), CIVIL (15%), BIOTECH (10%). The ratio of male to female candidates in CSE is 4:3, and in ECE is 3:2. Calculate: (a) The total number of female candidates in CSE, (b) The total number of male candidates in ECE, and (c) The ratio of total CSE students to total ECE female students.',
      points: 10,
      rubric: '3 marks for CSE total = 420; Females in CSE = (3/7)*420 = 180; 3 marks for ECE total = 300; Males in ECE = (3/5)*300 = 180; 4 marks for ECE females = 120; Ratio CSE total to ECE female = 420 : 120 = 7:2.',
      solutionOutline: '(a) 180 female students in CSE. (b) 180 male students in ECE. (c) 420 : 120 = 7 : 2.',
    },
  ],
};

// ============================================================================
// 3. END-SEMESTER WRITTEN QUESTIONS (10 questions per course x 7 = 70 questions)
// PROVISIONAL DRAFT TEMPLATE: "Attempt any 7 out of 10 questions" (10 marks each, Total 70 marks, 180 mins)
// ============================================================================

export const ENDSEM_WRITTEN_BANK: Record<string, WrittenQuestionSpec[]> = {
  CSE202: [
    {
      prompt: 'Elaborate on the C++ Memory Model and the lifecycle of objects in Automatic, Static, Dynamic, and Thread storage duration. Explain RAII (Resource Acquisition Is Initialization) with a custom Smart Pointer implementation.',
      points: 10,
      rubric: '4 marks for object storage durations; 4 marks for RAII design pattern; 2 marks for custom smart pointer class managing dynamic resource.',
      solutionOutline: 'RAII binds resource allocation to object lifetime. UniquePtr implementation with overloaded operator*, operator->, and move semantics.',
    },
    {
      prompt: 'Differentiate between Function Overloading, Operator Overloading, and Template Specialization. Write a generic template class Matrix<T, Rows, Cols> in C++ with addition and scalar multiplication.',
      points: 10,
      rubric: '4 marks for comparison of compile-time polymorphism mechanisms; 6 marks for complete Matrix template class with row/col non-type template parameters.',
      solutionOutline: 'template<typename T, size_t R, size_t C> class Matrix { T data[R][C]; ... };',
    },
    {
      prompt: 'Analyze Move Semantics and Rvalue References (&&) introduced in modern C++. Explain std::move, universal references, and write a class demonstrating Move Constructor and Move Assignment Operator.',
      points: 10,
      rubric: '3 marks for rvalue vs lvalue theory; 4 marks for move constructor/assignment transferring heap pointers; 3 marks for std::move and noexcept specification.',
      solutionOutline: 'Buffer(Buffer&& other) noexcept : ptr(other.ptr), sz(other.sz) { other.ptr = nullptr; other.sz = 0; }',
    },
    {
      prompt: 'Design an Object-Oriented Banking System in C++ demonstrating Inheritance, Polymorphism, and Abstract Interfaces. Include an Account interface, SavingsAccount, and CurrentAccount classes with transaction history.',
      points: 10,
      rubric: '3 marks for clean interface design; 4 marks for concrete derived classes overriding deposit/withdraw; 3 marks for transaction audit tracking.',
      solutionOutline: 'Abstract class Account with virtual bool withdraw(double) = 0. SavingsAccount enforces minimum balance; CurrentAccount allows overdraft.',
    },
    {
      prompt: 'Explain the C++ Standard Template Library (STL) architecture. Discuss the interaction between Containers (sequence vs associative), Iterators (categories), and Algorithms (transform, sort, find_if).',
      points: 10,
      rubric: '4 marks for STL architectural triad; 3 marks for iterator categories (input, forward, bidirectional, random access); 3 marks for lambda algorithm integration.',
      solutionOutline: 'Iterators decouple algorithms from containers. Example demonstrating std::vector with std::transform and custom lambda.',
    },
    {
      prompt: 'Examine Type Casting operators in C++: static_cast, dynamic_cast, const_cast, and reinterpret_cast. Explain how dynamic_cast utilizes Run-Time Type Information (RTTI) and what it returns for failed pointer versus reference casts.',
      points: 10,
      rubric: '4 marks for all four casting operators; 3 marks for RTTI mechanism and vtable type_info pointer; 3 marks for pointer returning nullptr and reference throwing std::bad_cast.',
      solutionOutline: 'static_cast compile-time; dynamic_cast runtime downcast; const_cast strips const; reinterpret_cast raw bitwise cast.',
    },
    {
      prompt: 'What are Functors and Lambda Expressions in C++? Explain the capture clause ([&], [=], [this]), mutable keyword, and how the compiler generates anonymous closure classes for lambdas.',
      points: 10,
      rubric: '3 marks for Functor operator() overloading; 4 marks for lambda capture modes; 3 marks for compiler-generated closure class internals.',
      solutionOutline: 'Lambda is syntactic sugar for a class overloading operator(). Captures become private member variables of the closure.',
    },
    {
      prompt: 'Discuss File Handling and Stream Serialization in C++. Write a program that serializes and deserializes an array of Student records (id, name, gpa) to and from a binary file using std::fstream.',
      points: 10,
      rubric: '3 marks for stream flags (ios::binary, ios::in, ios::out); 4 marks for read() and write() binary operations; 3 marks for robust file stream error checking.',
      solutionOutline: 'file.write(reinterpret_cast<char*>(&student), sizeof(Student)); file.read(...);',
    },
    {
      prompt: 'Analyze Exception Safety Guarantees in C++: Basic, Strong, and No-throw (noexcept). Explain the Copy-and-Swap idiom and demonstrate how it provides the Strong Exception Safety guarantee for assignment operators.',
      points: 10,
      rubric: '4 marks for defining the 3 levels of exception safety; 4 marks for Copy-and-Swap idiom code; 2 marks for showing how resource deallocation is deferred until success.',
      solutionOutline: 'T& operator=(T other) { swap(*this, other); return *this; } - passes by value, swaps contents safely.',
    },
    {
      prompt: 'Explain the Design Patterns in C++: Singleton, Factory Method, and Observer. Implement the Observer Pattern in C++ to notify multiple Display modules when a WeatherSensor updates temperature.',
      points: 10,
      rubric: '3 marks for pattern classifications (Creational vs Behavioral); 5 marks for Subject/Observer interface and implementation; 2 marks for loose coupling benefits.',
      solutionOutline: 'class Observer { virtual void update(float temp) = 0; }; class Subject { std::vector<Observer*> list; void notify(); };',
    },
  ],

  CSE203: [
    {
      prompt: 'Define Propositional and First-Order Predicate Logic. Translate the following English statements into Predicate Logic with domain as all university students: (a) Every student who works hard passes all exams, (b) Some students study AI but no student studies without sleeping.',
      points: 10,
      rubric: '4 marks for logical formalisms; 3 marks for statement (a) with universal and existential quantifiers; 3 marks for statement (b) with proper domain scoping.',
      solutionOutline: 'forall x (Student(x) ^ WorksHard(x) -> forall y (Exam(y) -> Passes(x, y))).',
    },
    {
      prompt: 'State and prove Euler\'s Formula for planar connected graphs: V - E + F = 2. Use it to prove that in any simple planar graph with V >= 3 vertices, E <= 3V - 6, and show that K_5 is non-planar.',
      points: 10,
      rubric: '4 marks for induction proof on edges of V - E + F = 2; 3 marks for deriving 2E >= 3F -> E <= 3V - 6; 3 marks for showing K_5 has V=5, E=10 > 3(5)-6=9, hence non-planar.',
      solutionOutline: 'Induction on edges. Face-edge inequality 2E >= 3F combined with V - E + F = 2 yields E <= 3V - 6.',
    },
    {
      prompt: 'Explain Graph Coloring and the Chromatic Number chi(G). State the Four Color Theorem. Find the chromatic number of: (a) Complete graph K_n, (b) Bipartite graph K_{m,n}, (c) Cycle graph C_n for even and odd n.',
      points: 10,
      rubric: '3 marks for defining vertex coloring and chromatic number; 4 marks for finding chi(K_n)=n, chi(K_{m,n})=2; 3 marks for chi(C_n)=2 for even n and 3 for odd n.',
      solutionOutline: 'K_n requires n distinct colors. Bipartite requires 2. Even cycles require 2; odd cycles require 3.',
    },
    {
      prompt: 'Discuss Tree Traversals (Pre-order, In-order, Post-order). Given In-order: D B E A F C G and Pre-order: A B D E C F G, reconstruct the unique Binary Tree and write its Post-order traversal.',
      points: 10,
      rubric: '4 marks for tree reconstruction derivation; 4 marks for drawing accurate binary tree; 2 marks for Post-order traversal: D E B F G C A.',
      solutionOutline: 'Root is A. In-order splits left subtree {D,B,E} and right subtree {F,C,G}. Resulting tree post-order: D E B F G C A.',
    },
    {
      prompt: 'Explain the Principle of Inclusion-Exclusion for n sets. How many integers between 1 and 1000 (inclusive) are divisible by neither 3, nor 5, nor 7?',
      points: 10,
      rubric: '3 marks for formula |A U B U C| = S1 - S2 + S3; 4 marks for calculating multiples: N3=333, N5=200, N7=142, pairs and triple; 3 marks for subtracting from 1000 to get 457.',
      solutionOutline: 'S1 = 333 + 200 + 142 = 675. S2 = 66 + 47 + 28 = 141. S3 = 9. Union = 675 - 141 + 9 = 543. Answer = 1000 - 543 = 457.',
    },
    {
      prompt: 'Define a Group, Abelian Group, and Ring in Abstract Algebra. Let Z_n be the set of integers modulo n under addition. Prove that (Z_n, +_n) forms a finite cyclic Abelian group, and find all generators of (Z_8, +_8).',
      points: 10,
      rubric: '3 marks for algebraic structure definitions (closure, associativity, identity, inverse, commutativity); 4 marks for proving group axioms for (Z_n, +_n); 3 marks for generators of Z_8: {1, 3, 5, 7}.',
      solutionOutline: 'Generators of Z_n are elements coprime to n: gcd(k, 8) = 1 -> k in {1, 3, 5, 7}.',
    },
    {
      prompt: 'Solve the non-homogeneous recurrence relation: a_n - 4a_{n-1} + 4a_{n-2} = 3^n for n >= 2, with initial conditions a_0 = 1 and a_1 = 5.',
      points: 10,
      rubric: '3 marks for homogeneous solution a_n^(h) = (c_1 + c_2*n)*2^n; 3 marks for particular solution a_n^(p) = A*3^n with A=9; 4 marks for solving c_1=-8, c_2=2, giving a_n = (-8 + 2n)*2^n + 9*3^n.',
      solutionOutline: 'r^2 - 4r + 4 = (r-2)^2 -> roots 2, 2. A*3^n - 4A*3^{n-1} + 4A*3^{n-2} = 3^n -> A = 9.',
    },
    {
      prompt: 'Explain Boolean Algebras as Lattices. State the absorption, distributive, and complement laws. Minimize the Boolean expression F(w, x, y, z) = (w\' + x + y\') * (w\' + y + z\') * (x\' + y\' + z\') algebraically.',
      points: 10,
      rubric: '4 marks for lattice-theoretic definition of Boolean Algebra; 4 marks for algebraic manipulation steps; 2 marks for simplified POS/SOP form.',
      solutionOutline: 'Apply consensus theorem and distribution to eliminate redundant terms.',
    },
    {
      prompt: 'State Kuratowski\'s Theorem for planar graphs. Explain graph minors and subdivisions. Use Kuratowski\'s theorem to determine whether the Petersen Graph is planar, showing the K_{3,3} or K_5 minor.',
      points: 10,
      rubric: '3 marks for stating Kuratowski\'s theorem (contains no subgraph homeomorphic to K_5 or K_{3,3}); 4 marks for Petersen graph structure; 3 marks for demonstrating K_{3,3} topological minor.',
      solutionOutline: 'Petersen graph contains a subgraph that is a subdivision of K_{3,3}, proving it is strictly non-planar.',
    },
    {
      prompt: 'Define Finite State Automata (DFA and NFA). Design a Deterministic Finite Automaton (DFA) over the alphabet Sigma = {0, 1} that accepts all binary strings containing an even number of 0s and an odd number of 1s.',
      points: 10,
      rubric: '3 marks for formal 5-tuple definition (Q, Sigma, delta, q0, F); 4 marks for 4 states {q_ee, q_eo, q_oe, q_oo}; 3 marks for transition table and state diagram with final state q_eo.',
      solutionOutline: 'States track parity of 0s and 1s. Start state q_ee (even 0, even 1). Final state q_eo (even 0, odd 1).',
    },
  ],

  CSE204: [
    {
      prompt: 'Explain the Divide-and-Conquer paradigm. Analyze the Strassen\'s Matrix Multiplication algorithm: write its recurrence relation, explain why 7 multiplications are sufficient instead of 8, and derive its O(n^{2.807}) time complexity.',
      points: 10,
      rubric: '3 marks for standard O(n^3) matrix multiplication; 4 marks for Strassen\'s 7 sub-matrix equations; 3 marks for T(n) = 7T(n/2) + O(n^2) solving to Theta(n^{log_2 7}) = O(n^{2.807}).',
      solutionOutline: 'Standard algorithm takes 8 mults -> T(n)=8T(n/2)+O(n^2) = O(n^3). Strassen computes 7 products M1..M7 -> n^{log_2 7} approx 2.807.',
    },
    {
      prompt: 'Explain the Matrix Chain Multiplication problem in Dynamic Programming. Given matrices A1(10x20), A2(20x30), A3(30x40), A4(40x30), compute the minimum scalar multiplications and parenthesization table m[i, j].',
      points: 10,
      rubric: '3 marks for recurrence m[i, j] = min_{k} (m[i, k] + m[k+1, j] + p_{i-1}p_k p_j); 4 marks for computed tables m and s; 3 marks for optimal parenthesization: ((A1(A2A3))A4).',
      solutionOutline: 'Fill upper-triangular table for chain lengths 2, 3, 4. Optimal cost = 30,000 multiplications.',
    },
    {
      prompt: 'Compare dynamic programming approaches for all-pairs shortest paths: Floyd-Warshall Algorithm versus Johnson\'s Algorithm for sparse graphs. Write the Floyd-Warshall pseudocode and explain transitive closure.',
      points: 10,
      rubric: '4 marks for Floyd-Warshall O(V^3) algorithm; 3 marks for Johnson\'s algorithm using Bellman-Ford reweighting + Dijkstra O(V^2 log V + VE); 3 marks for transitive closure with Warshall\'s variant.',
      solutionOutline: 'D[i,j] = min(D[i,j], D[i,k] + D[k,j]). Johnson reweights edges w\'(u,v) = w(u,v) + h(u) - h(v) >= 0.',
    },
    {
      prompt: 'Describe the Maximum Network Flow problem. State the Max-Flow Min-Cut Theorem. Explain the Ford-Fulkerson method and the Edmonds-Karp algorithm (using BFS for shortest augmenting paths) with O(V * E^2) complexity proof.',
      points: 10,
      rubric: '3 marks for residual graph and augmenting path definitions; 3 marks for Max-Flow Min-Cut theorem statement and proof sketch; 4 marks for Edmonds-Karp BFS bounding augmenting steps to O(VE).',
      solutionOutline: 'Capacity constraint and flow conservation. Edmonds-Karp uses BFS, each edge becomes critical at most |V|/2 times, giving O(VE^2).',
    },
    {
      prompt: 'Explain String Matching algorithms: Knuth-Morris-Pratt (KMP) versus Rabin-Karp. Derive the Failure Function (pi array) for pattern P = "ABABCABAB", and trace KMP searching in text T = "ABABABCAABABCABAB".',
      points: 10,
      rubric: '4 marks for KMP prefix function construction and table; 4 marks for linear time O(n + m) search trace showing zero backtracking in text; 2 marks for Rabin-Karp rolling hash concept.',
      solutionOutline: 'Prefix table pi for "ABABCABAB" = [0, 0, 1, 2, 0, 1, 2, 3, 4]. Text pointer i never decrements.',
    },
    {
      prompt: 'Explain the Backtracking paradigm. Formulate the N-Queens problem on an 8x8 chessboard. Write the recursive backtracking algorithm, explain constraint checking for rows, columns, and diagonals, and discuss pruning efficiency.',
      points: 10,
      rubric: '3 marks for state space tree definition; 4 marks for recursive pseudocode with valid(row, col) helper; 3 marks for diagonal constraint formulas (|r1 - r2| == |c1 - c2|) and branch pruning.',
      solutionOutline: 'Place queen row by row. If col/diagonal attacked, backtrack. Board representation in array queens[row] = col.',
    },
    {
      prompt: 'Detail the Branch-and-Bound algorithmic strategy. Apply Branch and Bound to solve the Traveling Salesperson Problem (TSP) using a cost matrix reduction lower bound technique on a 4-city cost matrix.',
      points: 10,
      rubric: '3 marks for Branch-and-Bound concepts (state space tree, bounding function, priority queue exploration); 5 marks for row and column reduction lower bounds; 2 marks for optimal tour discovery.',
      solutionOutline: 'Reduce rows and columns by subtracting minimums. Lower bound = sum of reductions. Explore least bound branch first.',
    },
    {
      prompt: 'Define the complexity classes P, NP, NP-Complete, and NP-Hard. Explain polynomial-time reduction (A <=_p B). State Cook-Levin Theorem, and show how 3-SAT reduces to the Clique problem.',
      points: 10,
      rubric: '4 marks for rigorous definitions of P, NP, NPC, and NPH; 2 marks for Cook-Levin theorem (SAT is NP-Complete); 4 marks for 3-SAT to Clique reduction gadget construction.',
      solutionOutline: 'Graph with 3 vertices per clause. Connect non-conflicting literals across different clauses. k clauses correspond to a clique of size k.',
    },
    {
      prompt: 'Explain Huffman Coding for lossless data compression. Given characters {A: 45, B: 13, C: 12, D: 16, E: 9, F: 5} with their frequencies, construct the optimal Huffman Tree, generate variable-length prefix codes, and calculate average bits per character.',
      points: 10,
      rubric: '3 marks for greedy prefix-free tree properties; 4 marks for step-by-step min-priority queue merge operations; 3 marks for assigned binary codes and average code length calculation.',
      solutionOutline: 'F(5)+E(9)=14. C(12)+B(13)=25. 14+D(16)=30. 25+30=55. A(45)+55=100. Average length = 2.24 bits/char.',
    },
    {
      prompt: 'Explain Randomized Algorithms: Las Vegas versus Monte Carlo algorithms with examples. Describe Randomized Quicksort, prove why choosing a random pivot yields expected O(n log n) running time, and explain high-probability bounds.',
      points: 10,
      rubric: '3 marks for Las Vegas (always correct, random time) vs Monte Carlo (fixed time, bounded error probability); 4 marks for indicator random variables proof of O(n log n); 3 marks for worst-case mitigation.',
      solutionOutline: 'Expected comparisons E[X] = sum sum (2 / (j - i + 1)) = O(n log n). Adversary cannot construct worst-case input.',
    },
  ],

  CSE207: [
    {
      prompt: 'Explain the Quine-McCluskey (Tabular) minimization method. Minimize the Boolean function F(A, B, C, D) = sum m(0, 1, 2, 5, 6, 7, 8, 9, 10, 14) + d(4, 15) by generating all prime implicants and selecting the essential prime implicants.',
      points: 10,
      rubric: '4 marks for grouping by number of 1s and adjacent pair combinations; 3 marks for prime implicant chart; 3 marks for identifying essential prime implicants and minimal SOP expression.',
      solutionOutline: 'Table with column 1 (single minterms), column 2 (pairs), column 3 (quads). Minimal SOP: F = C\'D\' + A\'B + B\'D\' + ...',
    },
    {
      prompt: 'Design a Carry Lookahead Adder (CLA) for 4-bit addition. Derive the equations for Carry Generate (G_i) and Carry Propagate (P_i), write the lookahead carry expressions C1, C2, C3, C4 in terms of C0, and explain the propagation delay advantage.',
      points: 10,
      rubric: '3 marks for G_i = A_i*B_i and P_i = A_i ^ B_i definitions; 4 marks for expanded expressions for C1..C4 independent of preceding carries; 3 marks for constant O(1) delay comparison vs Ripple Carry O(n).',
      solutionOutline: 'C1 = G0 + P0*C0; C2 = G1 + P1*G0 + P1*P0*C0; C3 = ...; C4 = ... All carries evaluated in parallel via 2 gate delays.',
    },
    {
      prompt: 'Design a BCD (Binary Coded Decimal) to 7-Segment Decoder for a common-cathode display. Present the truth table for inputs A, B, C, D and outputs a, b, c, d, e, f, g, derive minimal expressions using K-maps, and draw the logic schematic for segments a and b.',
      points: 10,
      rubric: '3 marks for truth table (0-9 valid, 10-15 don\'t cares); 4 marks for K-maps for segment \'a\' and segment \'b\'; 3 marks for logic diagram showing gates.',
      solutionOutline: 'Standard BCD 7-seg decoder. a = A + C + BD + B\'D\'; b = B\' + C\'D\' + CD.',
    },
    {
      prompt: 'Explain the internal architecture and programming technologies of Programmable Logic Devices (PLDs): PROM, PLA (Programmable Logic Array), and PAL (Programmable Array Logic). Implement a Full Adder using a PLA with 3 inputs, 4 product terms, and 2 outputs.',
      points: 10,
      rubric: '4 marks for comparing PROM (fixed AND, programmable OR), PLA (programmable AND, programmable OR), and PAL (programmable AND, fixed OR); 4 marks for PLA program table; 2 marks for schematic.',
      solutionOutline: 'PLA table with inputs A, B, Cin. 4 product terms shared between Sum and Carry.',
    },
    {
      prompt: 'Analyze Finite State Machine (FSM) models: Mealy Machine versus Moore Machine. Design a synchronous sequence detector that detects the binary sequence "1011" on an input stream X allowing overlapping sequences. Show state diagram, state table, excitation equations using D flip-flops, and schematic.',
      points: 10,
      rubric: '3 marks for Mealy vs Moore comparison (output on transition vs state); 3 marks for state diagram with 4 states (S0, S1, S2, S3); 4 marks for D flip-flop excitation equations and circuit diagram.',
      solutionOutline: 'Overlapping detector: S0(reset) ->1-> S1("1") ->0-> S2("10") ->1-> S3("101") ->1-> S1("1", output=1).',
    },
    {
      prompt: 'Design a Modulo-6 Asynchronous (Ripple) Counter using negative-edge triggered J-K flip-flops. Explain how a feedback NAND gate connected to the asynchronous clear (CLR) inputs resets the counter upon reaching binary count 6 (110_2). Draw the timing diagram and waveform.',
      points: 10,
      rubric: '3 marks for ripple counter cascade (Q outputs clocking next stage); 4 marks for feedback gate decoding state 110_2 (Q2=1, Q1=1) to pulse CLR; 3 marks for timing waveforms showing glitch and reset.',
      solutionOutline: '3 FFs (MOD-8 base). NAND gate connected to Q2 and Q1 resets counter immediately when 110 is reached.',
    },
    {
      prompt: 'Explain Semiconductor Memory hierarchy: SRAM (Static RAM) versus DRAM (Dynamic RAM) cell design and operation. Contrast volatile RAM with non-volatile Flash memory (NAND vs NOR architecture).',
      points: 10,
      rubric: '4 marks for 6T SRAM latch vs 1T-1C DRAM capacitive cell; 3 marks for DRAM refresh cycles and sense amplifiers; 3 marks for NAND vs NOR Flash read speed, density, and endurance.',
      solutionOutline: 'SRAM uses bistable latch (fast, low density, no refresh). DRAM stores charge in capacitor (dense, requires periodic refresh).',
    },
    {
      prompt: 'What are Hazards in combinational logic circuits: Static-0, Static-1, and Dynamic Hazards? Explain how delays in logic gates cause momentary glitches. Show how to detect and eliminate a static-1 hazard in F(A, B, C) = A*B + A\'*C using an additional consensus term.',
      points: 10,
      rubric: '3 marks for hazard definitions and timing waveform illustrations; 4 marks for K-map loop analysis showing non-overlapping adjacent groups; 3 marks for adding consensus term BC to prevent glitch.',
      solutionOutline: 'When A switches 1->0 while B=1, C=1, delay in inverter causes brief 0. Adding term BC ensures continuous output 1.',
    },
    {
      prompt: 'Design an Arithmetic Logic Unit (ALU) slice capable of performing 4 operations: ADD, SUBTRACT, AND, OR using a Full Adder and multiplexers. Present the function select table, internal multiplexer configurations, and the 2\'s complement subtraction control.',
      points: 10,
      rubric: '4 marks for function select table with mode control lines; 4 marks for Full Adder with B input XORed with control line M for 2\'s complement; 2 marks for output multiplexing logic.',
      solutionOutline: 'Use Full Adder with B_in = B ^ SUB, Cin = SUB. When SUB=1, computes A + B\' + 1 = A - B.',
    },
    {
      prompt: 'Discuss Digital Logic Families: TTL (Transistor-Transistor Logic) versus CMOS (Complementary MOS). Compare propagation delay, power dissipation, noise margin, fan-in, and fan-out characteristics.',
      points: 10,
      rubric: '4 marks for CMOS vs TTL parameter comparison table; 3 marks for CMOS zero static power consumption principle; 3 marks for noise margin calculations (V_OH, V_OL, V_IH, V_IL).',
      solutionOutline: 'CMOS has high input impedance, low static power, high noise immunity. TTL uses BJT with faster dynamic switching in legacy systems.',
    },
  ],

  CSE213: [
    {
      prompt: 'Analyze Advanced Multithreading in Java: java.util.concurrent framework. Compare synchronized blocks with ReentrantLock, ReadWriteLock, and StampedLock. Write a thread-safe BoundedBuffer using Condition variables (notFull and notEmpty) implementing the Producer-Consumer pattern.',
      points: 10,
      rubric: '3 marks for Lock vs synchronized comparison; 4 marks for explicit ReentrantLock with two Condition objects; 3 marks for while-loop await() guard preventing spurious wakeups.',
      solutionOutline: 'Lock lock = new ReentrantLock(); Condition notFull = lock.newCondition(); Condition notEmpty = lock.newCondition();',
    },
    {
      prompt: 'Examine the Fork/Join Framework and Parallel Streams in Java. Explain the Work-Stealing algorithm used by ForkJoinPool. Write a RecursiveTask<Long> implementation that computes the sum of elements in an array of 10,000,000 numbers in parallel.',
      points: 10,
      rubric: '3 marks for ForkJoinPool architecture and work-stealing deque mechanism; 4 marks for RecursiveTask class overriding compute() with threshold check; 3 marks for fork() and join() invocations.',
      solutionOutline: 'class SumTask extends RecursiveTask<Long> { compute(): if (len < THRESHOLD) sequentialSum(); else fork subtasks and join. }',
    },
    {
      prompt: 'Discuss Java Bytecode, Classloading, and the Java Agent instrumentation mechanism. Detail the delegation model of ClassLoaders (Bootstrap, Extension/Platform, Application). Explain how to implement a custom ClassLoader to load encrypted .class byte arrays.',
      points: 10,
      rubric: '4 marks for ClassLoader delegation parent-first hierarchy; 4 marks for findClass() and defineClass() method implementations in custom loader; 2 marks for decryption hook.',
      solutionOutline: 'CustomClassLoader extends ClassLoader: overrides findClass(String name), reads encrypted file, decrypts bytes, calls defineClass().',
    },
    {
      prompt: 'Explain the Java Reflection API and Dynamic Proxies. Describe how java.lang.reflect.Proxy and InvocationHandler enable runtime method interception. Implement a simple LoggingProxy that records execution timestamps and arguments for all methods of an interface.',
      points: 10,
      rubric: '3 marks for Reflection capabilities and performance trade-offs; 4 marks for InvocationHandler class implementing invoke(); 3 marks for Proxy.newProxyInstance factory invocation.',
      solutionOutline: 'class LoggingHandler implements InvocationHandler { invoke(proxy, method, args): log start, method.invoke(target, args), log end. }',
    },
    {
      prompt: 'Detail the Java Modules System (Project Jigsaw introduced in Java 9). Explain module-info.java declarations: exports, requires, requires transitive, opens, and provides ... with. Discuss how encapsulation is enforced against deep reflection.',
      points: 10,
      rubric: '4 marks for module directives and visibility rules; 3 marks for strong encapsulation prohibiting setAccessible() without opens; 3 marks for modular migration advantages.',
      solutionOutline: 'module com.example.service { requires com.example.core; exports com.example.service.api; opens com.example.service.model to spring.core; }',
    },
    {
      prompt: 'Analyze Java Network Programming. Compare Blocking I/O (ServerSocket/Socket) with Non-Blocking I/O (java.nio: Selector, SocketChannel, ByteBuffer). Write a high-performance asynchronous echo server using NIO Selectors.',
      points: 10,
      rubric: '4 marks for BIO one-thread-per-connection vs NIO multiplexed Selector thread; 4 marks for NIO server loop processing SelectionKey (isAcceptable, isReadable); 2 marks for Buffer operations (flip, clear).',
      solutionOutline: 'Selector selector = Selector.open(); serverChannel.register(selector, SelectionKey.OP_ACCEPT); while(selector.select() > 0) process keys.',
    },
    {
      prompt: 'Explain the CompletableFuture class in Java for asynchronous reactive programming. Differentiate between thenApply(), thenAccept(), thenCompose(), and thenCombine(). Write a pipeline that asynchronously fetches user profile, order history, and merges them concurrently.',
      points: 10,
      rubric: '4 marks for CompletableFuture methods and thread pool dispatch (supplyAsync); 4 marks for thenCombine() combining two independent async tasks; 2 marks for exceptionally() error handling.',
      solutionOutline: 'CompletableFuture.supplyAsync(()->getUser()).thenCombine(CompletableFuture.supplyAsync(()->getOrders()), (user, orders) -> buildDashboard(user, orders)).',
    },
    {
      prompt: 'Discuss Enterprise Java Database Connectivity and Object-Relational Mapping (ORM) fundamentals. Explain Connection Pooling (HikariCP) and Dirty Checking. Contrast raw JDBC, Spring JdbcTemplate, and Hibernate JPA in terms of performance and abstraction.',
      points: 10,
      rubric: '4 marks for connection pooling mechanics and lifecycle; 3 marks for ORM impedance mismatch and first/second level caching; 3 marks for comparative performance evaluation.',
      solutionOutline: 'HikariCP maintains warm pool of reusable connections avoiding socket handshake latency. JPA automates entity state persistence.',
    },
    {
      prompt: 'Examine Java Security Architecture: SecurityManager, CodeSource, Permissions, and Cryptography Architecture (JCA/JCE). Write a program demonstrating AES-256 GCM encryption and decryption with a secure random IV and authentication tag.',
      points: 10,
      rubric: '4 marks for JCA architecture (MessageDigest, Cipher, KeyGenerator); 4 marks for AES/GCM/NoPadding implementation with GCMParameterSpec; 2 marks for secure IV generation.',
      solutionOutline: 'Cipher.getInstance("AES/GCM/NoPadding"); SecureRandom.getInstanceStrong().nextBytes(iv); cipher.init(Cipher.ENCRYPT_MODE, key, spec).',
    },
    {
      prompt: 'Explain Java Performance Tuning and Profiling techniques. Detail JVM startup flags (-Xms, -Xmx, -XX:+UseG1GC, -XX:+HeapDumpOnOutOfMemoryError). How do you analyze thread dumps to diagnose Deadlocks and CPU-bound thread spikes using jstack and jconsole?',
      points: 10,
      rubric: '4 marks for critical JVM garbage collection and heap flags; 3 marks for diagnosing deadlocks (BLOCKED state on mutual monitors); 3 marks for resolving memory leaks using heap dump dominator trees.',
      solutionOutline: 'jstack <pid> reveals threads waiting for locks held by each other. Memory leak identified by surviving generation growth in visualvm/Eclipse MAT.',
    },
  ],

  ENT243: [
    {
      prompt: 'Analyze the Venture Capital investment lifecycle from Deal Sourcing to Due Diligence, Term Sheet Negotiation, Board Governance, and Exit Strategy (IPO vs M&A). Detail the economic and control clauses in a standard Term Sheet: Liquidation Preference, Anti-Dilution, Drag-Along, and Protective Provisions.',
      points: 10,
      rubric: '4 marks for VC lifecycle stages; 4 marks for term sheet clauses (1x participating vs non-participating liquidation preference, weighted-average anti-dilution); 2 marks for governance rights.',
      solutionOutline: 'Term sheet balances economics (valuation, liquidation preference) and control (board seats, protective provisions, information rights).',
    },
    {
      prompt: 'Explain the Crossing the Chasm framework by Geoffrey Moore. Detail the Technology Adoption Life Cycle: Innovators, Early Adopters, The Chasm, Early Majority, Late Majority, and Laggards. Discuss pragmatic strategies for a B2B SaaS startup to cross the chasm.',
      points: 10,
      rubric: '4 marks for defining the 5 adopter segments; 3 marks for explaining the psychological chasm between Visionaries and Pragmatists; 3 marks for the D-Day strategy (niche bowling pin strategy).',
      solutionOutline: 'Target a beachhead market segment (single bowling pin), dominate with whole product solution, expand into adjacent segments.',
    },
    {
      prompt: 'Develop an in-depth Financial Pro-Forma Model for a seed-stage technology company over 3 years. Formulate Income Statement projections, Operating Expense breakdowns (R&D, S&M, G&A), Headcount growth, Cash Runway, and Break-Even point.',
      points: 10,
      rubric: '4 marks for pro-forma financial statement components; 4 marks for realistic revenue buildup and margin assumptions; 2 marks for break-even formula and runway calculation.',
      solutionOutline: 'Revenue = Customers * ARPU. Expenses = Headcount salaries + Cloud hosting + S&M. Runway = Cash Balance / Monthly Net Burn.',
    },
    {
      prompt: 'Explain Corporate Governance in high-growth startups. Discuss the fiduciary responsibilities of the Board of Directors, duties of loyalty and care, management of Conflicts of Interest, and the structure of Founder Vesting agreements with 1-year cliff and 4-year schedule.',
      points: 10,
      rubric: '3 marks for Board fiduciary duties; 4 marks for 4-year vesting with 1-year cliff mechanism and accelerated vesting (single vs double trigger); 3 marks for ESOP pool allocation.',
      solutionOutline: 'Vesting aligns founder incentives. If founder departs within 12 months, zero equity vests; remaining equity vests monthly over 36 months.',
    },
    {
      prompt: 'Examine Product-Market Fit (PMF) indicators and quantitative validation metrics. Detail Sean Ellis\'s 40% test ("How would you feel if you could no longer use the product?"), Net Promoter Score (NPS), and Cohort Retention Curves (Smile Retention Curve).',
      points: 10,
      rubric: '3 marks for Sean Ellis test threshold (>40% very disappointed indicates PMF); 4 marks for Cohort retention analysis flattening above zero; 3 marks for organic referral and negative churn signals.',
      solutionOutline: 'Cohort retention curve flattening horizontally demonstrates sticky product-market fit. Negative net churn indicates expansion revenue exceeds churn.',
    },
    {
      prompt: 'Analyze Pricing Strategies for technology products: Cost-Plus, Competitor-Based, Value-Based, and Freemium. Discuss how to design tiering for a university examination platform (Free Tier, Department Tier, Campus-Wide Enterprise License).',
      points: 10,
      rubric: '4 marks for comparative analysis of pricing paradigms; 4 marks for designing value metrics (per student/per exam session vs annual seat license); 2 marks for enterprise pricing drivers.',
      solutionOutline: 'Value-based pricing captures percentage of customer value created (cheaper than physical proctoring staff while reducing cheating liability).',
    },
    {
      prompt: 'Discuss Enterprise Sales Cycles and Go-To-Market (GTM) Strategy for Higher Education institutions. Address procurement committees, FERPA/GDPR compliance reviews, pilot deployment strategies, and Land-and-Expand sales motions.',
      points: 10,
      rubric: '3 marks for university procurement stakeholders (Provost, CIO, Dean, Faculty Senate); 4 marks for compliance gating and free pilot protocol; 3 marks for Land-and-Expand account expansion.',
      solutionOutline: 'Start with innovative department chair for semester pilot -> demonstrate integrity metrics -> scale to university-wide RFP.',
    },
    {
      prompt: 'Explain Mergers and Acquisitions (M&A) as a startup exit mechanism. Differentiate between Strategic Acquirers and Financial Acquirers (Private Equity). Discuss the stages of an acquisition: Letter of Intent (LOI), Data Room Due Diligence, Representations & Warranties, and Escrow holdbacks.',
      points: 10,
      rubric: '4 marks for Strategic vs Financial buyers; 3 marks for LOI, due diligence, and Definitive Agreement phases; 3 marks for indemnity escrow and earn-out provisions.',
      solutionOutline: 'Strategic acquirer pays premium for synergies, IP, or talent (acqui-hire). Escrow accounts hold 10-15% of purchase price for warranty claims.',
    },
    {
      prompt: 'Analyze the ethical and societal responsibilities of Artificial Intelligence technology entrepreneurs. Discuss algorithmic bias, student surveillance privacy concerns, explainable AI versus black-box automated penalty assignment, and human-in-the-loop governance.',
      points: 10,
      rubric: '4 marks for ethical challenges in algorithmic proctoring; 3 marks for student dignity and transparent explainability; 3 marks for establishing human-led final adjudication policies.',
      solutionOutline: 'AI must act as sensor, not judge. Explainable telemetry logs allow human examiners to review context before assigning academic penalties.',
    },
    {
      prompt: 'Detail the Pitch Deck structure required for institutional venture capital fundraising. Outline the essential 10 slides: Problem, Solution, Market Size (TAM/SAM/SOM), Product Demo, Traction, Business Model, Competition, Go-To-Market, Team, and The Ask.',
      points: 10,
      rubric: '5 marks for comprehensive description of all 10 slide contents; 3 marks for narrative storytelling flow; 2 marks for articulating a compelling use of funds and milestone roadmap.',
      solutionOutline: 'Narrative arc: Urgent pain -> Scalable solution -> Huge market -> Strong traction -> Experienced team -> Specific capital ask to hit next milestones.',
    },
  ],

  SEC203: [
    {
      prompt: 'A person travels from town A to town B at an average speed of 60 km/h and returns from town B to town A along the same route at 40 km/h. Calculate the harmonic mean average speed for the entire round trip, and prove why simple arithmetic mean gives an incorrect answer.',
      points: 10,
      rubric: '3 marks for arithmetic mean fallacy (time spent at slower speed is greater); 4 marks for Harmonic Mean formula: 2xy / (x + y) = (2 * 60 * 40) / 100 = 48 km/h; 3 marks for total distance / total time algebraic proof.',
      solutionOutline: 'Average Speed = Total Distance / Total Time = 2D / (D/60 + D/40) = 2 / (5/120) = 48 km/h.',
    },
    {
      prompt: 'An investor divides Rs 50,000 between two investment schemes: Scheme A offers 8% simple interest per annum, while Scheme B offers 10% compound interest per annum compounded annually. If the total interest earned across both schemes after 2 years is Rs 9,300, calculate the exact amount invested in each scheme.',
      points: 10,
      rubric: '3 marks for setting up variables x and 50000 - x; 3 marks for interest equations: SI = 0.16x, CI = 0.21(50000 - x); 4 marks for solving 0.16x + 10500 - 0.21x = 9300 -> 0.05x = 1200 -> x = Rs 24,000 in Scheme A and Rs 26,000 in Scheme B.',
      solutionOutline: 'Scheme A = Rs 24,000; Scheme B = Rs 26,000.',
    },
    {
      prompt: 'A and B together can complete a project in 18 days. B and C together can complete it in 24 days, while A and C together can complete it in 36 days. Calculate: (a) In how many days can all three complete the project working together? (b) In how many days can A complete the project alone?',
      points: 10,
      rubric: '3 marks for summing equations 2(A + B + C) = 1/18 + 1/24 + 1/36 = (4 + 3 + 2)/72 = 9/72 = 1/8; 3 marks for A+B+C rate = 1/16, so together they take 16 days; 4 marks for A alone = (A+B+C) - (B+C) = 1/16 - 1/24 = 1/48, so A alone takes 48 days.',
      solutionOutline: '(a) Together: 16 days. (b) A alone: 48 days.',
    },
    {
      prompt: 'From a standard well-shuffled pack of 52 playing cards, four cards are drawn at random without replacement. Calculate the exact probability that: (a) All four cards belong to different suits, (b) All four cards are Aces, and (c) Exactly two cards are red and two cards are black.',
      points: 10,
      rubric: '3 marks for part (a) (13^4) / C(52, 4) = 28561 / 270725 = approx 0.1055; 3 marks for part (b) C(4, 4) / C(52, 4) = 1 / 270725; 4 marks for part (c) [C(26, 2) * C(26, 2)] / C(52, 4) = (325 * 325) / 270725 = 105625 / 270725 = 0.3901.',
      solutionOutline: 'Sample space C(52, 4) = 270,725. (a) 13*13*13*13 / 270725. (b) 1 / 270725. (c) 325 * 325 / 270725.',
    },
    {
      prompt: 'Solve the Data Interpretation set: A university examination cell records the following pass percentages across 4 semesters for 3 colleges: College X: [75%, 80%, 85%, 90%]; College Y: [80%, 70%, 75%, 85%]; College Z: [65%, 75%, 80%, 82%]. If each college enrolled 500 candidates per semester, calculate: (a) Overall aggregate pass percentage of College X across all 4 semesters, (b) Percentage difference in total passed candidates between College X and College Y, and (c) Semester with highest combined passing percentage.',
      points: 10,
      rubric: '3 marks for College X aggregate (75+80+85+90)/4 = 82.5%; 4 marks for total passed: X = 1650, Y = 1550, diff = 100 students (6.45% higher than Y); 3 marks for combined semester totals (Semester 4 highest: 257 students avg = 85.67%).',
      solutionOutline: '(a) 82.5%. (b) Difference of 100 passed students. (c) Semester 4.',
    },
    {
      prompt: 'Solve the Logical Seating Arrangement: Eight professors A, B, C, D, E, F, G, and H sit around a circular table facing the center. (1) D sits third to the left of A. (2) F sits second to the right of D. (3) B sits second to the left of H, who is not an immediate neighbor of A or D. (4) C sits between G and A. (5) E is not an immediate neighbor of D. Determine the exact clockwise seating order and answer: Who sits opposite to F?',
      points: 10,
      rubric: '4 marks for step-by-step circular placement deduction; 3 marks for complete validated clockwise arrangement; 3 marks for identifying the professor seated directly opposite F.',
      solutionOutline: 'Deduce circular arrangement satisfying all 5 boundary conditions.',
    },
    {
      prompt: 'A dishonest milkman claims to sell milk at cost price, but mixes tap water with pure milk. If he earns a net profit of 25% by selling the mixture at the cost price of pure milk, determine: (a) The ratio of water to pure milk in the mixture, and (b) The percentage of pure milk in the total mixture.',
      points: 10,
      rubric: '4 marks for setting up Cost Price of Milk = Re 1/liter, SP of mixture = Re 1/liter; 4 marks for CP of mixture = 1 / 1.25 = Rs 0.80, so Ratio Water : Milk = 0.20 : 0.80 = 1 : 4; 2 marks for percentage pure milk = 4/5 * 100 = 80%.',
      solutionOutline: '(a) Water : Milk ratio is 1 : 4. (b) Milk percentage is 80%.',
    },
    {
      prompt: 'A clock is set correctly at 8:00 AM on Monday. It loses 10 minutes every 24 hours. What will be the true standard time when the clock indicates 1:00 PM on the following Friday?',
      points: 10,
      rubric: '3 marks for total elapsed indicated time: Mon 8 AM to Fri 1 PM = 96 + 5 = 101 hours; 4 marks for indicated rate: 23 hours 50 mins = 143/6 hours indicated equals 24 true hours; 3 marks for true elapsed hours calculation = 101 * (144/143) = 101.7 hours -> approx 1:42 PM on Friday.',
      solutionOutline: 'Indicated 143/6 hrs = True 24 hrs. True time is 1:42 PM on Friday.',
    },
    {
      prompt: 'A container contains 80 liters of pure milk. From this container, 8 liters of milk are taken out and replaced with water. This process is repeated two more times (total 3 operations). How much pure milk remains in the container, and what is the final purity percentage?',
      points: 10,
      rubric: '4 marks for repeated dilution formula: Remaining = Initial * (1 - x/C)^n; 4 marks for 80 * (1 - 8/80)^3 = 80 * (0.9)^3 = 80 * 0.729 = 58.32 liters; 2 marks for purity percentage = (58.32 / 80) * 100 = 72.9%.',
      solutionOutline: 'Remaining Milk = 80 * (9/10)^3 = 58.32 liters. Final purity = 72.9%.',
    },
    {
      prompt: 'Solve the Critical Reasoning and Argumentation: "The university should replace all physical invigilation with automated AI webcam monitoring because it eliminates human bias and cuts proctoring costs by 70%." Formulate: (a) Two critical hidden assumptions in the statement, (b) One strong argument that weakens the conclusion, and (c) One robust compromise policy that balances integrity, cost, and equity.',
      points: 10,
      rubric: '3 marks for hidden assumptions (e.g., student hardware/bandwidth is uniform; AI accuracy is 100% free of demographic false positives); 3 marks for weakening argument (false positives in low-light, student anxiety, algorithmic bias); 4 marks for proposing hybrid proctoring with human examiner review.',
      solutionOutline: 'Critical evaluation of AI proctoring tradeoffs proposing assistive edge analysis with mandatory human verification.',
    },
  ],
};

