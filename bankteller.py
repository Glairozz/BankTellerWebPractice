class BankAccount:
    SEPARATOR = "------------------------"

    def __init__(self, initial_balance=0):
        self._balance = initial_balance

    @property
    def balance(self):
        return self._balance

    def show_balance(self):
        print(self.SEPARATOR)
        print(f"Your balance is: ${self._balance:.2f}")
        print(self.SEPARATOR)

    def deposit(self):
        print(self.SEPARATOR)
        amount = float(input("Enter amount to deposit: "))
        print(self.SEPARATOR)

        if amount < 0:
            print(self.SEPARATOR)
            print("Enter a valid amount.")
            print(self.SEPARATOR)
            return 0
        self._balance += amount
        return amount

    def withdraw(self):
        print(self.SEPARATOR)
        amount = float(input("Enter amount to withdraw: "))
        print(self.SEPARATOR)

        if amount > self._balance:
            print(self.SEPARATOR)
            print("Insufficient funds.")
            print(self.SEPARATOR)
            return 0
        elif amount < 0:
            print(self.SEPARATOR)
            print("Enter a valid amount.")
            print(self.SEPARATOR)
            return 0
        self._balance -= amount
        return amount

    @staticmethod
    def display_menu():
        print(BankAccount.SEPARATOR)
        print("Banking Program")
        print(BankAccount.SEPARATOR)
        print("1. Show Balance")
        print("2. Deposit")
        print("3. Withdraw")
        print("4. Exit")
        print(BankAccount.SEPARATOR)


def main():
    account = BankAccount()
    is_running = True

    while is_running:
        BankAccount.display_menu()
        choice = input("Choose an option: ")

        if choice == '1':
            account.show_balance()
        elif choice == '2':
            account.deposit()
        elif choice == '3':
            account.withdraw()
        elif choice == '4':
            is_running = False
        else:
            print(BankAccount.SEPARATOR)
            print("Invalid option, please try again.")
            print(BankAccount.SEPARATOR)

    print(BankAccount.SEPARATOR)
    print("Thank you for using the banking program.")
    print(BankAccount.SEPARATOR)


if __name__ == "__main__":
    main()
