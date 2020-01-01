#!/usr/bin/env python3

"""Given the parameter stack_name, define the variable STACK_OUTPUT.

Example:

  tasks:
    - name: set STACK_OUTPUT
      get_stack_output:
        stack_name: dokku-stack

"""

from ansible.module_utils.basic import AnsibleModule
import boto3


def main():

    module = AnsibleModule(argument_spec={'stack_name': {'required': True, 'type': 'str'}})

    stack_name = module.params['stack_name']

    client = boto3.client('cloudformation')
    response = client.describe_stacks(StackName=stack_name)
    outputs = response['Stacks'][0]['Outputs']

    output = {
        'changed': True,
        'ansible_facts': {'STACK_OUTPUT': {d['OutputKey']: d['OutputValue'] for d in outputs}},
    }

    module.exit_json(**output)


if __name__ == '__main__':
    main()
