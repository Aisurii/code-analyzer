"""
ALL ISSUES EXAMPLE - PYTHON VERSION
This file demonstrates every type of issue the Code Complexity Analyzer can detect in Python
"""

# TODO: This file has intentional issues for testing
# FIXME: Don't use this code in production
# HACK: This is a demonstration file

# ISSUE: HARDCODED_SECRET - Hardcoded credentials
api_key = "sk_live_1234567890abcdef"
password = "mySecretPassword123"
auth_token = "bearer_token_12345678"
aws_secret = "aws_secret_access_key_123"

# ISSUE: GLOBAL_LEAK - Global variables everywhere
global_counter = 0
global_data = {}

# ISSUE: HIGH_COMPLEXITY, DEEP_NESTING, LONG_FUNCTION, TOO_MANY_PARAMETERS
def complex_function(param1, param2, param3, param4, param5, param6, param7, param8):
    """Function with excessive complexity and parameters"""

    # ISSUE: POOR_NAMING - Single letter and generic names
    x = 10
    y = 20
    temp = 0
    data = None

    # ISSUE: MAGIC_NUMBER - Magic numbers without explanation
    if param1 > 100:
        if param2 < 50:
            if param3 == 25:
                if param4 is not None:
                    if param5 > 75:
                        if param6 < 200:
                            # ISSUE: NESTED_LOOPS - Deeply nested loops
                            for i in range(100):
                                for j in range(100):
                                    for k in range(100):
                                        # ISSUE: STRING_CONCAT_IN_LOOP
                                        temp += "adding string " + str(i) + str(j) + str(k)

                                        if k % 2 == 0:
                                            x = x + 1
                                        elif k % 3 == 0:
                                            y = y + 1
                                        elif k % 5 == 0:
                                            temp = temp + 1
                                        elif k % 7 == 0:
                                            data = data if data else 0 + 1
                        else:
                            return 42
                    else:
                        return 99
                else:
                    return 777
            else:
                return 333
        else:
            return 666
    else:
        return 999

    # ISSUE: CONSOLE_LOG equivalent - print statements left in code
    print("Debug info:", x, y, temp)
    print("More debugging")

    return 1234


# ISSUE: EVAL_USAGE - Dangerous eval usage
def dangerous_eval(user_input):
    """SECURITY RISK: Using eval"""
    result = eval(user_input)
    return result


# ISSUE: SQL_INJECTION_RISK - SQL injection vulnerability
def sql_injection(user_id):
    """SECURITY RISK: String concatenation in SQL"""
    query = "SELECT * FROM users WHERE id = " + str(user_id)
    delete_query = "DELETE FROM users WHERE name = '" + user_id + "'"
    update_query = f"UPDATE users SET active = 1 WHERE id = {user_id}"
    return query


# ISSUE: EMPTY_CATCH - Empty except block
def empty_catch_block():
    """Empty exception handling"""
    try:
        dangerous_operation()
    except:
        # Empty - error silently ignored
        pass

    try:
        another_operation()
    except Exception as e:
        # Also empty
        pass


# ISSUE: CLOSURE_LEAK - Closure capturing large objects
def closure_leak():
    """Closure memory leak"""
    huge_list = [0] * 1000000

    def inner_function():
        # Captures huge_list in closure
        print(len(huge_list))

    return inner_function


# ISSUE: INEFFICIENT_ARRAY_OPS - Multiple list comprehensions
def inefficient_list_ops(data):
    """Multiple passes over data"""
    result = [x * 2 for x in data]
    result = [x for x in result if x > 10]
    result = [x + 1 for x in result]
    result = [x for x in result if x % 2 == 0]
    result = [str(x) for x in result]
    return result


# ISSUE: DEAD_CODE - Unused variables
def unused_variables():
    """Function with unused variables"""
    used = 10
    unused = 20  # Never used
    also_unused = 30  # Never used
    never_used = 40  # Never used

    return used


# ISSUE: GOD_CLASS - Class doing too much
class GodClass:
    """Class with too many responsibilities"""

    def __init__(self):
        self.data = {}
        self.users = []
        self.products = []
        self.orders = []
        self.cache = {}

    # Database operations
    def save_to_database(self):
        pass

    def load_from_database(self):
        pass

    def delete_from_database(self):
        pass

    # User management
    def create_user(self):
        pass

    def update_user(self):
        pass

    def delete_user(self):
        pass

    def authenticate_user(self):
        pass

    # Product management
    def add_product(self):
        pass

    def remove_product(self):
        pass

    def update_product(self):
        pass

    # Order processing
    def create_order(self):
        pass

    def process_payment(self):
        pass

    def send_email(self):
        pass

    # Validation
    def validate_email(self):
        pass

    def validate_password(self):
        pass

    # Logging
    def log_error(self):
        pass

    def log_info(self):
        pass

    # Caching
    def cache_data(self):
        pass

    def clear_cache(self):
        pass

    # Reporting
    def generate_report(self):
        pass

    def export_to_csv(self):
        pass


# ISSUE: FEATURE_ENVY - Method using data from another object
class FeatureEnvyExample:
    """Class with feature envy"""

    def __init__(self):
        self.value = 0

    def process_data(self, other_object):
        """Uses other object's data extensively"""
        result = (other_object.get_data() +
                 other_object.get_more_data() +
                 other_object.get_even_more_data() +
                 other_object.calculate() +
                 other_object.transform())

        return result


# ISSUE: TIGHT_COUPLING - Direct dependencies
class TightlyCoupledClass:
    """Tightly coupled to concrete implementations"""

    def __init__(self):
        self.service1 = ConcreteService1()
        self.service2 = ConcreteService2()
        self.service3 = ConcreteService3()

    def do_something(self):
        self.service1.method1()
        self.service2.method2()
        self.service3.method3()


class ConcreteService1:
    def method1(self):
        pass


class ConcreteService2:
    def method2(self):
        pass


class ConcreteService3:
    def method3(self):
        pass


# ISSUE: POOR_NAMING - Generic and unclear names
def foo(a, b):
    """Poor function name"""
    tmp = a
    obj = {}
    arr = []
    data2 = b

    return tmp + data2


def bar(baz):
    """Another poor name"""
    return baz


# Commented out code - ISSUE: COMMENTED_CODE
# def old_function():
#     x = 10
#     y = 20
#     return x + y

# old_var = "not used anymore"
# result = old_function()


# Multiple issues in one function
def multiple_issues_function():
    """Function demonstrating multiple issues at once"""

    # PRINT statement (equivalent to console.log)
    print("Starting")

    # MAGIC_NUMBER
    threshold = 42

    # POOR_NAMING
    tmp = 0
    x = 10

    # HARDCODED_SECRET
    secret = "password123"

    # EVAL_USAGE
    eval("tmp = 100")

    # EMPTY_CATCH
    try:
        do_something()
    except:
        pass

    # NESTED_LOOPS
    for i in range(10):
        for j in range(10):
            pass

    print("Done")
    return tmp


# Function with too many parameters
def too_many_params(
    param1,
    param2,
    param3,
    param4,
    param5,
    param6,
    param7,
    param8,
    param9
):
    """TOO_MANY_PARAMETERS issue"""
    return (param1 + param2 + param3 + param4 + param5 +
            param6 + param7 + param8 + param9)


# MISSING_ABSTRACTION - Repetitive code without abstraction
def process_user1(user):
    """Repetitive processing logic"""
    print("Processing user")
    name = user['name'].strip().lower()
    email = user['email'].strip().lower()
    return {'name': name, 'email': email}


def process_user2(user):
    """Same logic repeated"""
    print("Processing user")
    name = user['name'].strip().lower()
    email = user['email'].strip().lower()
    return {'name': name, 'email': email}


def process_user3(user):
    """Same logic repeated again"""
    print("Processing user")
    name = user['name'].strip().lower()
    email = user['email'].strip().lower()
    return {'name': name, 'email': email}


# Additional Python-specific issues
def python_specific_issues():
    """Python-specific problematic patterns"""

    # Using mutable default arguments
    def bad_default(items=[]):  # Mutable default
        items.append(1)
        return items

    # Global variable modification
    global global_counter
    global_counter += 1

    # Using * imports (if we had imports)
    # from module import *

    # Bare except clause
    try:
        risky_operation()
    except:  # Bare except catches everything
        pass

    # Multiple statements on one line
    x = 1; y = 2; z = 3

    return bad_default()


# Helper functions referenced above
def dangerous_operation():
    pass

def another_operation():
    pass

def do_something():
    pass

def risky_operation():
    pass


if __name__ == "__main__":
    print("This file contains intentional code quality issues for testing")
    print("DO NOT use this code in production!")
