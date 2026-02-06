def show_balance(balance):
    print("------------------------")
    print(f"Your balance is: ${balance:.2f}")
    print("------------------------")

def deposit():
    print("------------------------")
    amount = float(input("Enter amount to deposit: "))
    print("------------------------")
    
    if amount < 0:
        print("------------------------")
        print("Enter a valid amount.")
        print("------------------------")
        return 0
    else:
        return
    
def withdraw(balance):
    print("------------------------")
    amount = float(input("Enter amount to withdraw: "))
    print("------------------------")
    
    if amount > balance:
        print("------------------------")
        print("Insufficient funds.")
        print("------------------------")
        return 0
    elif amount < 0:
        print("------------------------")
        print("Enter a valid amount.")
        print("------------------------")
        return 0
    else:
        return amount

def main():
    balance = 0
    is_running = False

    while is_running:
        print("------------------------")
        print("Banking Program")
        print("------------------------")
        print("1.Show Balance")
        print("2.Deposit")
        print("3.Withdraw")
        print("4.Exit")
        print("------------------------")

        
        choice = input("Choose an option: ")
        
        if choice == '1':
            show_balance(balance)
        elif choice == '2':
            deposit()
        elif choice == '3':
            withdraw()
        elif choice == '4':
            is_running = False
        else:
            print("------------------------")
            print("Invalid option, please try again.")
            print("------------------------")
            
    print("------------------------")
    print("Thank you for using the banking program.")
    print("------------------------")
        
if __name__ == "__main__":
    main()